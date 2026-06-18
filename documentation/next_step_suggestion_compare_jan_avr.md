# Prochaine Étape : Implémentation de la Suggestion "Compare Jan-Avr ?"

Suite à l'implémentation réussie de "Volume 12 mois", la prochaine suggestion la plus logique et la plus pertinente à développer est **"Compare Jan-Avr ?"**.

## 1. Pourquoi ce choix ?

1. **Cohérence Visuelle** : La chip existe déjà dans le nouveau design du header (`<button className="suggestion-chip">Compare Jan-Avr ?</button>`).
2. **Besoin Métier Fort** : Comparer les performances d'une période par rapport à l'année précédente (YTD - Year To Date ou période spécifique) est l'un des KPIs les plus demandés en BI/Analytics.
3. **Faisabilité Technique Immédiate** : Nous avons déjà accès aux vues SQL nécessaires dans le backend :
   - `vw_AI_KPI_Commercial` (pour le Chiffre d'Affaires - CA).
   - `vw_AI_KPI_Exploitation` (pour le volume de dossiers et les retards/livraisons).
4. **Validation par la maquette** : Votre maquette montre exactement le rendu attendu pour cette question : *"Jan-Avr : CA +18.4%, dossiers +12%, retards -9%. Meilleur mois : Avril..."*.

---

## 2. Documentation d'Intégration (Comment le développer)

Voici le guide technique détaillé pour implémenter cette fonctionnalité "Fast-Track" sans impacter n8n.

### Étape 1 : Création de la logique Backend (`src/comparison.ts`)

Il faut créer un nouveau service backend (ou l'ajouter dans `kpi.ts`) qui va calculer ces deltas.

**Logique de la requête SQL :**
L'idée est de cibler l'année en cours (ex: 2026) et l'année précédente (ex: 2025) pour les mois 01 à 04.

```sql
-- Exemple de requête pour le CA (via vw_AI_KPI_Commercial)
SELECT 
    SUBSTRING(periode, 1, 4) as annee,
    SUM(ca_vente_total) as total_ca
FROM dbo.vw_AI_KPI_Commercial
WHERE SUBSTRING(periode, 6, 2) BETWEEN '01' AND '04'
  AND SUBSTRING(periode, 1, 4) IN ('2026', '2025')
GROUP BY SUBSTRING(periode, 1, 4)
```

**Traitement JS (Backend) :**
1. Récupérer le `total_ca` de 2026 et celui de 2025.
2. Calculer le delta : `((CA_2026 - CA_2025) / CA_2025) * 100`.
3. Faire de même pour le volume de dossiers avec `vw_AI_KPI_Exploitation`.
4. Identifier le meilleur mois (en itérant sur les résultats groupés par mois pour l'année en cours).

**Format de retour JSON (`VmindN8nResponse`) :**
Le backend devra renvoyer une réponse compatible avec le rendu Frontend actuel :
```json
{
  "ok": true,
  "tool_used": "get_period_comparison",
  "response_type": "full",
  "title": "Comparaison des performances (Janvier - Avril)",
  "message": "Jan-Avr : CA +18.4%, dossiers +12%, retards -9%. Meilleur mois : Avril (CA 1.847M, 63 dossiers, 7 retards). Tendance : positive.",
  "kpis": [
    { "label": "Évolution CA", "value": 18.4, "display": "+18.4%", "status": "success", "trend": "up" },
    { "label": "Évolution Dossiers", "value": 12, "display": "+12%", "status": "success", "trend": "up" }
  ],
  "chart": {
     "type": "bar",
     "title": "Comparaison CA (Année courante vs N-1)",
     "xKey": "label",
     "yKey": "value",
     "data": [
        { "label": "Jan-Avr 2025", "value": 1500000 },
        { "label": "Jan-Avr 2026", "value": 1847000 }
     ]
  }
}
```

### Étape 2 : Exposer l'Endpoint (`src/server-http.ts`)

Ajouter la nouvelle route HTTP dans le serveur Express du Backend :

```typescript
import { getPeriodComparison } from './comparison.js';

app.post('/api/tools/get-period-comparison', async (req, res) => {
    const { client_id, start_month = 1, end_month = 4, year = 2026 } = req.body;
    try {
        const result = await getPeriodComparison(client_id, start_month, end_month, year);
        res.json({ ok: true, data: result });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: { message: err.message } });
    }
});
```

### Étape 3 : Branchement Frontend (`VmindChat.tsx`)

Dans le composant React du chat, il suffit de rendre la chip existante cliquable en utilisant la méthode `handleSuggestionClick` qui est déjà codée et opérationnelle.

Trouver la ligne correspondante dans `VmindChat.tsx` :
```tsx
<button className="suggestion-chip">
  Compare Jan-Avr ?
</button>
```

Et la remplacer par :
```tsx
<button 
  onClick={() => handleSuggestionClick(
    "Compare les performances de janvier à avril", 
    "/api/tools/get-period-comparison", 
    { start_month: 1, end_month: 4 }
  )}
  className="suggestion-chip"
  disabled={isLoading}
>
  Compare Jan-Avr ?
</button>
```

---

## Résumé

L'intégration de la suggestion **"Compare Jan-Avr ?"** suit exactement le même pattern architectural "Fast-Track" que "Volume 12 mois". Elle apporte une immense valeur métier (analyse comparative de KPIs complexes) tout en restant visuellement alignée avec les maquettes UI (message texte concis + rendu visuel immédiat sans délai de réflexion de l'IA).

Dès que vous validez cette proposition, je peux entamer le développement du code backend et frontend de cette nouvelle puce de suggestion !
