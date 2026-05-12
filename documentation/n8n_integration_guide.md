# Documentation Intégration n8n & Affichage Dynamique (VMIND)

Ce document explique comment les données JSON sont récupérées depuis n8n et comment elles sont rendues dynamiquement dans l'interface VMIND.

## 1. Architecture de Communication

Le flux de données suit ce chemin :
`Next.js Frontend` -> `Backend Proxy (port 3001)` -> `n8n Webhook`

### Récupération du JSON (`shared/api/n8n-api.ts`)
La fonction `sendVmindMessage` gère l'envoi du prompt utilisateur et la réception de la réponse structurée. Elle utilise un Proxy local pour éviter les problèmes de CORS et centraliser la gestion des sessions.

```typescript
// Fichier : shared/api/n8n-api.ts
export async function sendVmindMessage(message: string, clientId = "DEMO") {
  const proxyUrl = "http://localhost:3001/api/n8n-proxy";
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, client_id: clientId, session_id: sessionId })
  });
  const data = await response.json();
  // n8n renvoie un tableau d'items, on extrait le contenu JSON
  return data[0].json || data[0];
}
```

## 2. Structure Standard de la Réponse (`VmindN8nResponse`)

L'affichage repose sur un contrat d'interface strict (`shared/types/vmind.ts`). n8n doit impérativement respecter ce format pour que les composants s'activent.

```typescript
export interface VmindN8nResponse {
  ok: boolean;           // Indique si le tool a réussi
  tool_used: string;     // ex: "get_invoice_detail"
  response_type: string; // "full", "kpi", "table", "chart", "error"
  title: string;         // Titre de la réponse
  message: string;       // Texte d'explication (Markdown supporté)
  kpis?: VmindKpi[];     // Tableau d'indicateurs
  table?: VmindTable;    // { columns: string[], rows: any[] }
  chart?: VmindChart;    // { type, data: {label, value}[] }
}
```

## 3. Logique de Rendu Dynamique (`StandardResponseRenderer.tsx`)

Le composant `StandardResponseRenderer` agit comme un dispatcher. Il ne s'occupe pas de "comment" afficher, mais de "quoi" afficher selon les données présentes dans le JSON.

### A. Les Indicateurs (KPIs)
- **Composant** : `KpiRenderer.tsx`
- **Condition** : `{kpis && kpis.length > 0 && <KpiRenderer kpis={kpis} />}`
- **Usage** : Pour afficher des chiffres clés (Chiffre d'affaires, nombre de factures, etc.) avec un statut (success, warning, danger).

### B. Les Tableaux
- **Composant** : `TableRenderer.tsx`
- **Condition** : `{table && table.rows && table.rows.length > 0 && <TableRenderer table={table} />}`
- **Usage** : Pour les listes détaillées (lignes de factures, liste de clients, cotations). Supporte le défilement horizontal.

### C. Les Graphiques
- **Composant** : `ChartRenderer.tsx`
- **Condition** : `{chart && chart.data && chart.data.length > 0 && <ChartRenderer chart={chart} />}`
- **Usage** : Visualisation de tendances. Supporte `bar`, `line`, `pie`, etc., via la bibliothèque de graphiques intégrée.

### D. Gestion des Erreurs
- **Condition** : `if (response_type === 'error')`
- **Rendu** : Une zone d'alerte rouge affichant le titre de l'erreur et le détail technique (`error.message`).

## 4. Association Fichiers / Code

| Partie du JSON | Composant React associé | Chemin du Fichier |
| :--- | :--- | :--- |
| `message` | Texte brut | `StandardResponseRenderer.tsx` |
| `kpis` | `KpiRenderer` | `components/vmind/renderers/KpiRenderer.tsx` |
| `table` | `TableRenderer` | `components/vmind/renderers/TableRenderer.tsx` |
| `chart` | `ChartRenderer` | `components/vmind/renderers/ChartRenderer.tsx` |
| `details` | `GenericDetailRenderer` | `components/vmind/renderers/GenericDetailRenderer.tsx` |
| `error` | Bloc Alerte Rose | `StandardResponseRenderer.tsx` |

---
*Note : Pour ajouter un nouveau type d'affichage, il suffit de créer un nouveau Renderer dans `components/vmind/renderers/` et de l'ajouter dans les conditions de `StandardResponseRenderer.tsx`.*
