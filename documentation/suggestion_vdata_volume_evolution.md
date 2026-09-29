# Documentation Technique Détaillée : Feature Suggestion VDATA & Tool `get_dossier_volume_evolution`

> **Fichiers créés/modifiés** :
> - `Vmind_Backend/src/volume.ts` — **[NEW]** Service métier
> - `Vmind_Backend/src/server-http.ts` — **[MODIFY]** Route HTTP directe
> - `Vmind_Backend/src/mcp-server.ts` — **[MODIFY]** Outil MCP
> - `Vmind_Front/app/page.tsx` — **[MODIFY]** Passage de prop
> - `Vmind_Front/components/vmind/VmindChat.tsx` — **[MODIFY]** UI dynamique + logique suggestion

---

## 1. Contexte et Objectif Métier

L'agent VDATA (Données & Analytics) est le premier agent de VMIND à disposer d'une zone de **suggestions cliquables** (chips). L'objectif est de permettre à l'utilisateur d'accéder à des analyses fréquentes d'un seul clic, sans attendre le cycle complet de l'IA (n8n → Claude → MCP → réponse).

La première suggestion implémentée est :
> **"Montre-moi l'évolution du volume des dossiers sur 12 mois"**

Cette question retourne :
- Un **graphique** (bar chart) montrant le nombre de dossiers par mois
- Des **KPIs** : total sur 12 mois, meilleur mois, pire mois, tendance

**Architecture choisie** : Le clic sur une chip court-circuite le workflow IA (n8n/Claude) et appelle directement l'API backend Node.js. Le workflow IA classique (questions libres tapées par l'utilisateur) reste inchangé.

---

## 2. Backend — Service Métier `src/volume.ts`

### 2.1 Déclaration et Interface

```typescript
import sql from 'mssql';
import { getDbPool } from './db.js';

export async function getDossierVolumeEvolution(client_id: string, months: number = 12) {
```

**Explication technique :**
- Le paramètre `months` est optionnel et vaut `12` par défaut. Cela permet à l'Agent IA (via MCP) de demander d'autres fenêtres temporelles (ex: 6 mois, 24 mois).
- La fonction est exportée pour être consommable à la fois par `server-http.ts` (route directe) et `mcp-server.ts` (outil IA).

---

### 2.2 Requête SQL

```typescript
    const pool = await getDbPool(client_id);
    const request = pool.request();
    
    request.input('months', sql.Int, months);
    
    const sqlQuery = `
        SELECT TOP (@months)
            periode,
            SUM(nb_dossiers) as nb_dossiers
        FROM dbo.vw_AI_KPI_Exploitation
        GROUP BY periode
        ORDER BY periode DESC
    `;
    
    const startTime = Date.now();
    const result = await request.query(sqlQuery);
    const duration = Date.now() - startTime;
    
    const rawRows = result.recordset;
```

**Explication technique :**
- **`TOP (@months)` + `ORDER BY periode DESC`** : On récupère les N derniers mois les plus récents en base. SQL Server triera d'abord tous les mois par ordre décroissant, puis ne gardera que les `@months` premiers. Cela garantit de ne pas charger des années d'historique.
- **`GROUP BY periode`** : La vue `vw_AI_KPI_Exploitation` peut contenir plusieurs lignes par période (une par nature de transport, par type de fret, etc.). Le `SUM(nb_dossiers)` agrège toutes les natures pour donner le **volume global** d'un mois donné.
- **`request.input('months', sql.Int, months)`** : Injection sécurisée anti-SQL injection (le paramètre est typé `Int` côté SGBD).
- **Chronomètre `startTime / duration`** : Mesure du temps de réponse SQL pour le logging.

---

### 2.3 Tri Chronologique Côté JS

```typescript
    // Trier chronologiquement (ASC) pour le graphique
    const sortedRows = rawRows.sort((a: any, b: any) => a.periode.localeCompare(b.periode));
```

**Explication technique :**
La requête SQL retourne les lignes en `DESC` (pour le `TOP`). Mais pour l'affichage d'un graphique en barres ou en ligne, on a besoin d'un tri chronologique ascendant (janvier → décembre). Le `.localeCompare()` fonctionne parfaitement car le format `YYYY-MM` est naturellement triable alphabétiquement.

---

### 2.4 Calcul des KPIs In-Memory

```typescript
    let totalDossiers = 0;
    let maxMonth = { periode: '', nb: -1 };
    let minMonth = { periode: '', nb: Infinity };
    
    const chartLabels: string[] = [];
    const chartData: number[] = [];

    sortedRows.forEach((row: any) => {
        const nb = Number(row.nb_dossiers) || 0;
        totalDossiers += nb;
        
        if (nb > maxMonth.nb) {
            maxMonth = { periode: row.periode, nb };
        }
        if (nb < minMonth.nb) {
            minMonth = { periode: row.periode, nb };
        }

        // Pour l'affichage Front: e.g. "2026-05" -> "Mai 2026"
        const [year, month] = row.periode.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        const label = date.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
        
        chartLabels.push(label);
        chartData.push(nb);
    });
```

**Explication technique :**
- **Complexité O(N)** : On parcourt les lignes une seule fois pour calculer le total, le meilleur mois et le pire mois.
- **Initialisation de `minMonth.nb` à `Infinity`** : Garantit que la première valeur rencontrée sera toujours inférieure et remplacera le minimum.
- **Transformation du label** : Le format brut SQL `2026-05` est converti en `mai 2026` pour un affichage humain lisible sur l'axe X du graphique. On crée un objet `Date` JS avec le mois (0-indexé, d'où le `-1`) et on utilise `toLocaleString('fr-FR')` pour obtenir le nom du mois en français.
- **`chartLabels` / `chartData`** : Ces deux tableaux seront injectés directement dans le format Chart.js attendu par le `ToolResultRenderer` du frontend.

---

### 2.5 Calcul de la Tendance

```typescript
    const firstNb = chartData[0];
    const lastNb = chartData[chartData.length - 1];
    let trendPct = 0;
    if (firstNb > 0) {
        trendPct = ((lastNb - firstNb) / firstNb) * 100;
    }
```

**Explication technique :**
La tendance est le pourcentage d'évolution entre le **premier mois** de la fenêtre (le plus ancien) et le **dernier mois** (le plus récent). 
- Si `firstNb = 50` et `lastNb = 70`, alors `trendPct = +40%` (croissance).
- Si `firstNb = 70` et `lastNb = 50`, alors `trendPct = -28.6%` (décroissance).
- La garde `if (firstNb > 0)` évite une division par zéro si le premier mois n'a aucun dossier.

---

### 2.6 Objet de Retour (Format ToolResultRenderer)

```typescript
    return {
        message: `Voici l'évolution du volume des dossiers sur les ${months} derniers mois.`,
        response_type: 'chart',
        kpis: [
            {
                title: `Total (${months} mois)`,
                value: totalDossiers.toString(),
                trend: trendPct,
                isGood: trendPct >= 0
            },
            {
                title: "Mois le plus élevé",
                value: maxMonth.nb.toString(),
                subtitle: maxMonth.periode
            },
            {
                title: "Mois le plus faible",
                value: minMonth.nb.toString(),
                subtitle: minMonth.periode
            }
        ],
        chart: {
            type: 'bar',
            labels: chartLabels,
            datasets: [
                {
                    label: 'Nombre de dossiers',
                    data: chartData,
                    borderColor: 'rgb(0, 229, 200)',
                    backgroundColor: 'rgba(0, 229, 200, 0.5)'
                }
            ]
        },
        raw: sortedRows
    };
```

**Explication technique :**
- **`response_type: 'chart'`** : Ce champ est lu par le `ToolResultRenderer` du frontend pour décider quel composant de rendu utiliser (graphique, tableau, texte, etc.).
- **`kpis`** : Tableau de KPIs structurés. Le frontend les affiche en cartes horizontales au-dessus du graphique. Le champ `trend` et `isGood` permettent au frontend d'afficher une flèche verte (hausse) ou rouge (baisse).
- **`chart.type: 'bar'`** : Indique au composant `ChartRenderer` d'utiliser un bar chart (Chart.js). Le format `{ labels, datasets }` est exactement celui attendu par Chart.js v4+.
- **`chart.datasets[0].borderColor` / `backgroundColor`** : Couleurs VDATA (`#00E5C8` = cyan/teal) pour la cohérence visuelle avec l'identité de l'agent.
- **`raw`** : Données brutes (les lignes SQL triées), fournies pour debug ou traitement additionnel.

---

### 2.7 Gestion d'Erreur

```typescript
    } catch (err: any) {
        console.error(`\n[VOLUME-EVOLUTION-ERROR] ❌ Erreur: ${err.message}`, err);
        return {
            isError: true,
            error: err.message
        };
    }
```

**Explication technique :**
Au lieu de `throw`, la fonction retourne un objet `{ isError: true }`. Le handler HTTP (`handleToolCall` dans `server-http.ts`) détecte ce flag et retourne un `{ ok: false }` au frontend, qui affichera alors un message d'erreur rouge.

---

## 3. Backend — Exposition HTTP (`src/server-http.ts`)

### 3.1 Import

```typescript
import { getDossierVolumeEvolution } from "./volume.js";
```

### 3.2 Route Express

```typescript
// 3.b Dossier Volume Evolution
app.post('/api/tools/get-dossier-volume-evolution', async (req, res) => {
    const { client_id, months } = req.body;
    await handleToolCall(req, res, "get_dossier_volume_evolution", () =>
        getDossierVolumeEvolution(client_id, months)
    );
});
```

**Explication technique :**
- La route est un simple `POST` qui extrait `client_id` et `months` du body JSON.
- `handleToolCall` est la fonction utilitaire existante (définie plus haut dans `server-http.ts`) qui wrappe l'appel dans un try/catch et standardise la réponse en `{ ok: true, data: ... }` ou `{ ok: false, error: ... }`.
- Le frontend appellera cette URL directement via `fetch()` lors du clic sur la suggestion.

---

## 4. Backend — Exposition MCP (`src/mcp-server.ts`)

### 4.1 Import

```typescript
import { getDossierVolumeEvolution } from "./volume.js";
```

### 4.2 Enregistrement de l'outil

```typescript
server.tool(
    "get_dossier_volume_evolution",
    "Retourne l'évolution du volume de dossiers (par mois) sur une période donnée avec les KPIs globaux.",
    {
        client_id: z.string().describe("Identifiant du tenant TraLIS"),
        months: z.number().optional().describe("Nombre de mois à analyser (défaut: 12)")
    },
    async ({ client_id, months }) => {
        try {
            const data = await getDossierVolumeEvolution(client_id, months);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
        } catch (error: any) {
            return {
                isError: true,
                content: [{ type: "text", text: error?.message ?? "Error" }],
            };
        }
    }
);
console.error("[MCP-SERVER] Registered tool: get_dossier_volume_evolution");
```

**Explication technique :**
- **`z.number().optional()`** : Le schéma Zod déclare `months` comme optionnel. Si l'Agent IA (Claude) ne le passe pas, la valeur par défaut `12` dans `volume.ts` sera utilisée.
- Cet outil est utilisable par Claude via le protocole MCP (questions en langage naturel). L'IA peut dire : *"Montre-moi l'évolution sur 24 mois"* et Claude passera `months: 24`.

---

## 5. Frontend — Mise à jour de `page.tsx`

### Modification

```diff
  <VmindChat
    initialPrompt={insertPrompt}
    onOpenVoice={() => setVoiceShow(true)}
    onAgentActive={setActiveAgentId}
+   activeAgentId={activeAgentId}
  />
```

**Explication technique :**
`page.tsx` disposait déjà du state `activeAgentId` et le recevait en callback via `onAgentActive`. On passe maintenant cette valeur en lecture à `VmindChat` pour qu'il puisse adapter visuellement son en-tête et ses suggestions selon l'agent actif.

---

## 6. Frontend — Mise à jour de `VmindChat.tsx`

### 6.1 Nouvelle Prop

```typescript
interface VmindChatProps {
  initialPrompt?: string;
  onOpenVoice: () => void;
  clientId?: string;
  onAgentActive?: (agentId: string) => void;
  activeAgentId?: string;     // ← NOUVEAU
}
```

### 6.2 En-tête Dynamique

```tsx
const currentAgentData = activeAgentId !== 'VMIND' ? (AGENTS as any)[activeAgentId] : null;

// Dans le JSX :
<div className="flex items-center gap-2">
    {currentAgentData && (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded"
              style={{ backgroundColor: currentAgentData.bgColor,
                       color: currentAgentData.color,
                       border: `1px solid ${currentAgentData.borderColor}` }}>
            {currentAgentData.icon}
        </span>
    )}
    <div className="chat-title text-cyan-400 font-bold text-lg">
        {currentAgentData ? `ASSISTANT ${currentAgentData.name}` : 'ASSISTANT VMIND'}
    </div>
</div>
<div className="chat-subtitle text-xs text-gray-400 mt-1">
    {currentAgentData ? currentAgentData.desc : 'Orchestration intelligente via Webhook'}
</div>
```

**Explication technique :**
- `currentAgentData` est résolu à partir du fichier `shared/constants/data.ts` qui contient déjà les configurations visuelles de chaque agent (nom, couleur, icône, description).
- Si l'agent actif est `VDATA`, le titre affichera "ASSISTANT VDATA", le badge affichera "VD" en couleur `#00E5C8`, et le sous-titre affichera "Données & Analytics".
- Si c'est `VMIND` (par défaut), le rendu reste identique à l'original. **Aucun code existant n'est cassé.**

### 6.3 Zone de Suggestions (Chips)

```tsx
{/* Suggestions Zone */}
{activeAgentId === 'VDATA' && (
    <div className="mt-3 flex flex-wrap gap-2">
        <button 
            onClick={() => handleSuggestionClick(
                "Montre-moi l'évolution du volume des dossiers sur 12 mois",
                "/api/tools/get-dossier-volume-evolution",
                { months: 12 }
            )}
            className="text-xs bg-[#1e293b]/60 hover:bg-[#1e293b] border border-cyan-500/20 hover:border-cyan-500/50 text-cyan-100 py-1.5 px-3 rounded-full transition-all cursor-pointer"
            disabled={isLoading}
        >
            📊 Volume 12 mois ?
        </button>
    </div>
)}
```

**Explication technique :**
- La zone de suggestions n'apparaît que si `activeAgentId === 'VDATA'`. Pour tout autre agent (VMIND, VFIN, etc.), l'en-tête reste classique.
- Chaque bouton appelle `handleSuggestionClick` avec 3 paramètres : le texte affiché dans le chat, l'URL de l'API backend, et le payload JSON.
- Le style est un "pill button" (arrondi `rounded-full`), avec un effet de survol subtil (opacité du border cyan qui augmente).
- Pour ajouter une nouvelle suggestion ultérieurement, il suffit d'ajouter un nouveau `<button>` dans cette `div` avec un endpoint différent.

### 6.4 Fonction `handleSuggestionClick` (Le Court-Circuit)

```typescript
const handleSuggestionClick = async (suggestion: string, toolEndpoint: string, payload: any) => {
    if (isLoading) return;

    // 1. Ajouter le message utilisateur (la suggestion cliquée)
    const userMessage: VmindMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: suggestion,
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
    };

    const thinkingMessage: VmindMessage = {
        id: `thinking-${Date.now()}`,
        sender: 'vm',
        text: '',
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        isThinking: true,
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);

    try {
        // 2. Appel DIRECT au backend Node.js (PAS de n8n / Claude)
        const response = await fetch(`http://localhost:3001${toolEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: clientId, ...payload })
        });
        const data = await response.json();

        setMessages((prev) => prev.filter(m => !m.isThinking));

        if (!response.ok || !data.ok) {
            // 3a. Erreur
            setMessages((prev) => [...prev, {
                id: `err-${Date.now()}`,
                sender: 'vm',
                text: data.error?.message || 'Erreur lors de l\'appel API direct',
                time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
                error: data.error?.message || 'API_ERROR',
            }]);
        } else {
            // 3b. Succès : injecter la réponse dans le chat
            const result = data.data;
            setMessages((prev) => [...prev, {
                id: `vm-${Date.now()}`,
                sender: 'vm',
                text: result.message || 'Voici les informations.',
                time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
                tool_used: 'direct_api',
                response_type: result.response_type || 'full',
                kpis: result.kpis,
                chart: result.chart,
                raw: result.raw
            }]);
        }
    } catch (error: any) {
        setMessages((prev) => prev.filter(m => !m.isThinking));
        setMessages((prev) => [...prev, {
            id: `err-${Date.now()}`,
            sender: 'vm',
            text: `Erreur de communication : ${error.message}`,
            time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
            error: error.message,
        }]);
    } finally {
        setIsLoading(false);
    }
};
```

**Explication technique détaillée :**

1. **Garde `if (isLoading) return`** : Empêche les doubles clics pendant qu'une requête est en cours.

2. **Injection du message utilisateur** : Le texte de la suggestion est ajouté au chat exactement comme si l'utilisateur l'avait tapé. Cela donne un aspect naturel à la conversation.

3. **`fetch` direct vers le backend** : C'est ici le cœur du "court-circuit". Au lieu d'appeler `sendVmindMessage()` (qui passe par n8n → Claude → MCP → backend), on fait un appel HTTP direct : `Frontend → Backend Node.js`. Le temps de réponse passe de ~5-15 secondes (IA complète) à ~200-500ms (SQL direct).

4. **Format de la réponse** : Le backend retourne `{ ok: true, data: { message, kpis, chart, raw } }`. Le code extrait `data.data` et l'injecte dans un `VmindMessage` avec les champs `kpis`, `chart`, `response_type`. Le `ToolResultRenderer` existant sait déjà afficher ces données en graphique et KPIs.

5. **`tool_used: 'direct_api'`** : Ce marqueur permet de distinguer dans les logs si une réponse vient du workflow IA ou d'un appel direct.

6. **La fonction `handleSend()` reste inchangée** : Les questions tapées manuellement par l'utilisateur continuent d'emprunter le chemin classique `sendVmindMessage → n8n`. Zéro impact sur le workflow existant.

---

## 7. Comment Tester

### 7.1 Test Backend Isolé

```bash
# Démarrer le backend
cd Vmind_Backend
npm run dev:http

# Appeler directement l'endpoint (PowerShell)
Invoke-RestMethod -Uri http://localhost:3001/api/tools/get-dossier-volume-evolution `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"client_id":"DEMO","months":12}'
```

**Résultat attendu** : Un JSON avec `ok: true`, contenant `data.kpis` (3 KPIs), `data.chart` (labels + datasets), et `data.raw` (lignes SQL brutes).

### 7.2 Test Frontend (Clic sur la Suggestion)

1. Démarrez le backend : `npm run dev:http` (dans `Vmind_Backend`)
2. Démarrez le frontend : `npm run dev` (dans `Vmind_Front`)
3. Ouvrez le navigateur sur `http://localhost:3000`
4. Dans la sidebar, cliquez sur l'agent **VDATA**
5. L'en-tête du chat doit afficher **"ASSISTANT VDATA"** avec le badge vert et le sous-titre **"Données & Analytics"**
6. La puce **"📊 Volume 12 mois ?"** doit apparaître sous le sous-titre
7. Cliquez dessus
8. Le message utilisateur apparaît dans le chat
9. Après ~200-500ms, le graphique en barres et les KPIs s'affichent

### 7.3 Test MCP (Via Claude Desktop)

Si vous avez configuré Claude Desktop avec le serveur MCP :
> **Prompt** : "Montre-moi l'évolution du volume des dossiers sur 6 mois"
> Claude appellera `get_dossier_volume_evolution({ client_id: "DEMO", months: 6 })`

---

## 8. Comment Ajouter une Nouvelle Suggestion

Pour ajouter une deuxième puce (ex: "Compare Jan-Avr ?"), il suffit de :

1. **Backend** : Créer le service dans un nouveau fichier `src/xxx.ts`, exposer via route HTTP et tool MCP.
2. **Frontend** : Ajouter un nouveau `<button>` dans la zone de suggestions de `VmindChat.tsx` :

```tsx
<button 
    onClick={() => handleSuggestionClick(
        "Compare les performances de janvier à avril",
        "/api/tools/get-compare-period",
        { from: "2026-01", to: "2026-04" }
    )}
    className="text-xs bg-[#1e293b]/60 hover:bg-[#1e293b] border border-cyan-500/20 hover:border-cyan-500/50 text-cyan-100 py-1.5 px-3 rounded-full transition-all cursor-pointer"
    disabled={isLoading}
>
    📈 Compare Jan-Avr ?
</button>
```

L'architecture est conçue pour accueillir autant de suggestions que nécessaire sans modifier la logique centrale.
