# VDATA - Analyse des retards par type de client

## 1. Objectif

La suggestion **Retards par type client ?** exécute directement une analyse TraLIS sans passer par n8n.

- Question injectée : `Analyse la corrélation entre retards et type de client`
- Route HTTP : `POST /api/tools/analyze-delay-by-client-type`
- Service partagé : `analyzeDelayByClientType(client_id)`
- Tool MCP : `analyze_delay_by_client_type`
- Période : mois courant, bornes `[premier jour du mois, premier jour du mois suivant[`.

## 2. Règle métier

L'analyse porte uniquement sur les mouvements de livraison réalisés :

```sql
MP.ID_Mouvement IS NOT NULL
AND OM.ID IS NOT NULL
AND OM.ID_Nature_Operation = 2
```

Les heures sont ignorées pendant la comparaison :

```sql
-- À temps
CONVERT(date, MP.DatePrevu) >= CONVERT(date, OM.Date_Demande)

-- En retard
CONVERT(date, MP.DatePrevu) < CONVERT(date, OM.Date_Demande)
```

`DateArrivee` et `DateArriveeReel` de `Exploitation_Dossier` ne participent pas au calcul.

## 3. Sources SQL

| Table | Rôle |
|---|---|
| `OMC_Mouvement_planifies MP` | Date prévue et lien vers le mouvement réalisé |
| `Exploitation_DetailExpedition DE` | Liaison mouvement-planifié vers dossier |
| `Exploitation_Dossier d` | Axe `ID_TypeClient` |
| `OMC_Mouvement OM` | Nature de l'opération et date réalisée/demandée |
| `Tiers_Tiers T` | Tiers métier lié à l'expédition |
| `Tiers_Types TC` | Libellé professionnel du type client |

Le libellé affiché vient de `Tiers_Types.Designation`. Une valeur absente est regroupée sous **Type non renseigné**.

Le lien vers `Tiers_Tiers` utilise un seul identifiant déterminé par le sens du dossier. Cela évite les doublons possibles avec une jointure contenant un `OR`.

## 4. Sécurité et période

Les bornes sont transmises avec des paramètres SQL Server :

```ts
request.input('dateStart', sql.VarChar(8), dateStart);
request.input('dateEnd', sql.VarChar(8), dateEnd);
```

Pour juin 2026 :

```text
dateStart = 20260601
dateEnd   = 20260701
```

Le filtre est appliqué sur `OM.Date_Demande`, date du mouvement réalisé :

```sql
OM.Date_Demande >= @dateStart
AND OM.Date_Demande < @dateEnd
```

## 5. Calculs retournés

Pour chaque type client :

- total des mouvements de livraison ;
- mouvements à temps ;
- mouvements en retard ;
- taux de retard ;
- rang et niveau de risque.

Le backend calcule aussi :

- total global analysé ;
- total global en retard ;
- taux global de retard ;
- type client le plus exposé ;
- classement décroissant par taux, puis par nombre de retards.

Seuils :

| Taux de retard | Statut VMIND | Libellé tableau |
|---|---|---|
| `>= 30%` | `danger` | Élevé |
| `>= 15%` | `warning` | À surveiller |
| `< 15%` | `success` | Maîtrisé |

## 6. Réponse VMIND

La réponse utilise le contrat standard :

```json
{
  "ok": true,
  "tool_used": "analyze_delay_by_client_type",
  "response_type": "full",
  "title": "Retards de livraison par type de client - juin 2026",
  "message": "Local présente le taux de retard le plus élevé...",
  "kpis": [],
  "table": { "columns": [], "rows": [] },
  "chart": { "type": "bar", "xKey": "label", "yKey": "value", "data": [] },
  "details": null,
  "raw": {},
  "error": null
}
```

L'interface affiche :

- un message métier synthétique ;
- trois KPI ;
- un histogramme du taux par type client ;
- un classement lisible ;
- aucun bloc technique `details` visible.

En l'absence de données, le service retourne `ok: true` avec un message explicatif et sans KPI/tableau/graphique trompeur.

## 7. Fichiers modifiés

- `Vmind_Backend/src/clientDelayCorrelation.ts` : requête, agrégations et réponse VMIND.
- `Vmind_Backend/src/server-http.ts` : route Fast-Track.
- `Vmind_Backend/src/mcp-server.ts` : déclaration MCP.
- `Vmind_Backend/src/quality.ts` : correction de la borne du mois suivant.
- `Vmind_Front/components/vmind/VmindChat.tsx` : chip et appel direct.
- `Vmind_Front/components/vmind/renderers/StandardResponseRenderer.tsx` : nom convivial du tool.

## 8. Tests de l'API

Démarrer le backend :

```powershell
cd C:\mcp\Vmind_Backend
npm run dev:http
```

Si `3001` est déjà utilisé, choisir un autre port :

```powershell
$env:PORT = '3002'
npm run dev:http
```

Dans un second terminal :

```powershell
$response = Invoke-RestMethod `
  -Uri 'http://localhost:3001/api/tools/analyze-delay-by-client-type' `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{"client_id":"DEMO"}'

$response.data | ConvertTo-Json -Depth 10
```

Contrôles attendus :

```powershell
$response.ok
$response.data.tool_used
$response.data.raw.date_start
$response.data.raw.date_end_exclusive
$response.data.table.rows
```

Puis démarrer le frontend :

```powershell
cd C:\mcp\Vmind_Front
npm run dev
```

Ouvrir VMIND, sélectionner VDATA puis cliquer sur **Retards par type client ?**. Dans l'onglet Network du navigateur, vérifier qu'un seul appel vise `/api/tools/analyze-delay-by-client-type` et qu'aucun webhook n8n n'est appelé.

## 9. Validation SQL sans données du mois courant

La base DEMO contrôlée le 22/06/2026 ne contient aucun mouvement de livraison en juin 2026. Le comportement sans données est donc testable immédiatement avec l'appel API précédent.

Pour valider la formule sans modifier la base, exécuter la requête du service sur une période historique connue. Exemple septembre 2025 :

```sql
DECLARE @dateStart varchar(8) = '20250901';
DECLARE @dateEnd varchar(8) = '20251001';

SELECT
    ISNULL(TC.Designation, 'Type non renseigné') AS type_client,
    COUNT(*) AS total_mouvements_livraison,
    SUM(CASE WHEN CONVERT(date, MP.DatePrevu) >= CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) AS mouvements_a_temps,
    SUM(CASE WHEN CONVERT(date, MP.DatePrevu) < CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) AS mouvements_en_retard,
    CAST(100.0 * SUM(CASE WHEN CONVERT(date, MP.DatePrevu) < CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) / COUNT(*) AS decimal(5,2)) AS taux_retard_pct
FROM dbo.OMC_Mouvement_planifies MP
JOIN dbo.Exploitation_DetailExpedition DE ON DE.ID = MP.ID_sousDossier
JOIN dbo.Exploitation_Dossier d ON d.ID = DE.ID_Dossier
JOIN dbo.OMC_Mouvement OM ON OM.ID = MP.ID_Mouvement
LEFT JOIN dbo.Tiers_Types TC ON TC.ID = d.ID_TypeClient
WHERE MP.ID_Mouvement IS NOT NULL
  AND OM.ID_Nature_Operation = 2
  AND MP.DatePrevu IS NOT NULL
  AND OM.Date_Demande >= @dateStart
  AND OM.Date_Demande < @dateEnd
GROUP BY d.ID_TypeClient, TC.Designation
ORDER BY taux_retard_pct DESC, mouvements_en_retard DESC;
```

Sur la copie DEMO examinée, septembre 2025 contient 8 mouvements, dont 3 en retard. Les dossiers ont toutefois `ID_TypeClient = NULL`, donc ils apparaissent dans une seule catégorie **Type non renseigné**.

## 10. Tester plusieurs types de clients

Pour obtenir un rendu riche, utiliser une base de recette ou une copie de DEMO, jamais la production :

1. Vérifier que `Tiers_Types` contient les types `Local`, `Etranger` et `Etatique`.
2. Créer ou dupliquer des dossiers de recette avec `ID_TypeClient` égal à `1`, `2` et `3`.
3. Relier leurs expéditions à des mouvements de livraison réalisés du mois courant.
4. Prévoir pour chaque type des dates à temps et en retard.
5. Relancer l'endpoint, puis vérifier les totaux avec la requête SQL ci-dessus en remplaçant les bornes.

Jeu de contrôle conseillé :

| Type | Total | Retards | Taux attendu | Statut |
|---|---:|---:|---:|---|
| Local | 10 | 1 | 10% | success |
| Etranger | 10 | 2 | 20% | warning |
| Etatique | 10 | 4 | 40% | danger |

Le résultat attendu est : **Etatique** en première position, 30 mouvements analysés, 7 retards et un taux global de 23,33%.

## 11. Vérifications techniques effectuées

```powershell
cd C:\mcp\Vmind_Backend
npm run build

cd C:\mcp\Vmind_Front
npm run build
```

Les deux builds doivent terminer sans erreur TypeScript.
