# Documentation Technique : Suggestion VDATA "Compare Jan-Avr ?" par agence

## 1. Objectif

Cette fonctionnalite ajoute un Fast-Track pour la chip VDATA :

```txt
Compare Jan-Avr ?
```

Au clic, VMIND injecte la question metier :

```txt
Compare les performances de janvier a avril par agence
```

Puis le frontend appelle directement le backend Express, sans passer par n8n ni par le workflow IA complet.

Endpoint HTTP :

```txt
POST /api/tools/compare-agency-performance-jan-apr
```

Tool metier et MCP :

```txt
compare_agency_performance_jan_apr
```

## 2. Source de donnees

La source de verite est la table TraLIS :

```sql
dbo.Exploitation_Dossier
```

L'axe agence correspond a :

```sql
dbo.Exploitation_Dossier.ID_Site
```

La vue `dbo.vw_AI_KPI_Exploitation` n'est pas utilisee pour cette fonctionnalite, car elle ne porte pas l'axe agence.

## 3. Fichiers ajoutes ou modifies

### Backend

Nouveau service :

```txt
C:\mcp\Vmind_Backend\src\agencyPerformance.ts
```

Responsabilites :

- selection de l'annee d'analyse ;
- execution SQL parametree ;
- calcul des KPIs par `ID_Site` et par mois ;
- aggregation par agence ;
- construction du message metier ;
- fallback prototype si aucune donnee reelle Jan-Avr n'existe.

Route HTTP modifiee :

```txt
C:\mcp\Vmind_Backend\src\server-http.ts
```

Ajout :

```ts
app.post('/api/tools/compare-agency-performance-jan-apr', async (req, res) => {
    const { client_id, year } = req.body;
    await handleToolCall(req, res, "compare_agency_performance_jan_apr", () =>
        compareAgencyPerformanceJanApr(client_id, year)
    );
});
```

Tool MCP modifie :

```txt
C:\mcp\Vmind_Backend\src\mcp-server.ts
```

Ajout du tool :

```txt
compare_agency_performance_jan_apr
```

### Frontend

Composant modifie :

```txt
C:\mcp\Vmind_Front\components\vmind\VmindChat.tsx
```

La chip appelle maintenant :

```ts
handleSuggestionClick(
  "Compare les performances de janvier a avril par agence",
  "/api/tools/compare-agency-performance-jan-apr",
  {}
)
```

Le tool est mappe sur l'agent :

```ts
'compare_agency_performance_jan_apr': 'VDATA'
```

## 4. Requete SQL

La requete utilise un parametre SQL Server securise :

```ts
request.input('year', sql.Int, selectedYear);
```

SQL execute :

```sql
SELECT
    ISNULL(CAST(ID_Site AS varchar(50)), 'N/A') AS agence,
    MONTH(CreatedOnDate) AS mois_num,
    DATENAME(MONTH, CreatedOnDate) AS mois_label,

    COUNT(ID) AS nb_dossiers,

    SUM(CASE WHEN EstCloture = 1 THEN 1 ELSE 0 END) AS nb_clotures,

    SUM(CASE WHEN EstFacture = 1 THEN 1 ELSE 0 END) AS nb_factures,

    SUM(
        CASE
            WHEN EstCloture = 1 AND ISNULL(EstFacture, 0) = 0
            THEN 1
            ELSE 0
        END
    ) AS nb_clotures_non_factures,

    CAST(
        CASE
            WHEN COUNT(ID) = 0 THEN 0
            ELSE 100.0 * SUM(CASE WHEN EstCloture = 1 THEN 1 ELSE 0 END) / COUNT(ID)
        END AS decimal(5,2)
    ) AS taux_cloture_pct,

    CAST(SUM(ISNULL(poidsTotal, 0)) AS decimal(18,2)) AS poids_total_kg,
    CAST(SUM(ISNULL(volumeTotal, 0)) AS decimal(18,2)) AS volume_total_m3,
    CAST(SUM(ISNULL(ValMarchandise, 0)) AS decimal(18,2)) AS valeur_marchandise_totale

FROM dbo.Exploitation_Dossier
WHERE CreatedOnDate >= DATEFROMPARTS(@year, 1, 1)
  AND CreatedOnDate < DATEFROMPARTS(@year, 5, 1)
GROUP BY
    ID_Site,
    MONTH(CreatedOnDate),
    DATENAME(MONTH, CreatedOnDate)
ORDER BY
    agence,
    mois_num;
```

## 5. Annee d'analyse

Le backend choisit l'annee dans cet ordre :

1. `year` transmis dans le body HTTP ;
2. variable d'environnement `VMIND_COMPARE_YEAR` ;
3. annee courante du serveur.

Exemple avec annee forcee :

```json
{
  "client_id": "DEMO",
  "year": 2025
}
```

## 6. Calculs backend

Le SQL retourne les lignes par agence et par mois. Le backend calcule ensuite :

- total dossiers global ;
- total dossiers clotures non factures ;
- meilleure agence par volume de dossiers ;
- meilleure agence par taux de cloture ;
- agence avec le plus de dossiers clotures non factures ;
- resume par agence sur Janvier-Avril.

Important : le meilleur taux de cloture par agence est recalcule sur les totaux Jan-Avr :

```txt
total_clotures_agence / total_dossiers_agence * 100
```

Il ne s'agit pas d'une moyenne simple des taux mensuels.

## 7. Format JSON retourne

Le service retourne un objet directement compatible avec le renderer VMIND existant :

```json
{
  "ok": true,
  "tool_used": "compare_agency_performance_jan_apr",
  "response_type": "full",
  "title": "Comparaison des performances par agence - Janvier a Avril 2026",
  "message": "Voici la comparaison des performances par agence entre janvier et avril 2026...",
  "kpis": [],
  "table": {
    "columns": [
      "agence",
      "mois_label",
      "nb_dossiers",
      "nb_clotures",
      "nb_factures",
      "nb_clotures_non_factures",
      "taux_cloture_pct",
      "poids_total_kg",
      "volume_total_m3",
      "valeur_marchandise_totale"
    ],
    "rows": []
  },
  "chart": {
    "type": "bar",
    "title": "Dossiers par agence - Janvier a Avril",
    "description": "Comparaison du volume total par agence",
    "xKey": "label",
    "yKey": "value",
    "data": []
  },
  "details": null,
  "raw": {
    "year": 2026,
    "period": "Janvier - Avril",
    "is_demo_data": false
  },
  "error": null
}
```

## 8. Fallback prototype

Si la requete SQL ne retourne aucune ligne entre janvier et avril, le backend retourne un jeu prototype propre avec :

```json
"raw": {
  "is_demo_data": true
}
```

Ce fallback permet de tester :

- l'affichage du message ;
- les KPI cards ;
- le tableau ;
- le chart ;
- le branchement de la chip ;
- la demo VDATA meme sans donnees reelles.

Le message indique explicitement que les donnees sont prototype. Les informations techniques restent dans `raw` pour diagnostic, mais `details` vaut `null` afin de ne pas afficher de bloc JSON brut a l'utilisateur.

## 9. Tests backend

Lancer le backend :

```powershell
cd C:\mcp\Vmind_Backend
npm run dev:http
```

Tester l'endpoint avec l'annee par defaut :

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/tools/compare-agency-performance-jan-apr `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"client_id":"DEMO"}'
```

Tester avec une annee precise :

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/tools/compare-agency-performance-jan-apr `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"client_id":"DEMO","year":2025}'
```

Verifier si la reponse vient du fallback :

```powershell
$r = Invoke-RestMethod -Uri http://localhost:3001/api/tools/compare-agency-performance-jan-apr `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"client_id":"DEMO"}'

$r.data.raw.is_demo_data
```

Si le resultat est `True`, aucune donnee reelle Jan-Avr n'a ete trouvee pour l'annee analysee.

## 10. Comment tester avec la base si vous n'avez pas de dossiers Jan-Avr multi-agences

### Option A : trouver une annee existante avec plusieurs agences

Utiliser le tool readonly existant :

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/tools/run-readonly-query `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "client_id": "DEMO",
    "query": "SELECT YEAR(CreatedOnDate) AS annee, COUNT(ID) AS nb_dossiers, COUNT(DISTINCT ISNULL(CAST(ID_Site AS varchar(50)), ''N/A'')) AS nb_agences FROM dbo.Exploitation_Dossier WHERE CreatedOnDate >= DATEFROMPARTS(YEAR(CreatedOnDate), 1, 1) AND CreatedOnDate < DATEFROMPARTS(YEAR(CreatedOnDate), 5, 1) GROUP BY YEAR(CreatedOnDate) ORDER BY annee DESC"
  }'
```

Choisir une annee ou `nb_agences > 1`, puis relancer :

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/tools/compare-agency-performance-jan-apr `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"client_id":"DEMO","year":2024}'
```

### Option B : forcer l'annee backend pour la demo

Dans `C:\mcp\Vmind_Backend\.env`, ajouter par exemple :

```env
VMIND_COMPARE_YEAR=2024
```

Puis redemarrer le backend.

La chip front n'a pas besoin d'envoyer `year`, elle utilisera l'annee forcee cote backend.

### Option C : tester uniquement l'UI avec fallback prototype

Si aucune annee ne contient plusieurs agences entre janvier et avril, il suffit de lancer l'appel sans `year`.

Le backend retournera une reponse prototype avec plusieurs agences, ce qui valide :

- le fast-track ;
- le rendu VMIND ;
- la table ;
- le chart ;
- le message ;
- les KPIs.

### Option D : donnees de test reelles

Pour tester avec de vraies lignes SQL multi-agences, le mieux est d'utiliser une base de developpement ou une copie de TraLIS, puis creer des dossiers de test via les mecanismes applicatifs TraLIS habituels.

Eviter de faire des `INSERT` directs dans `dbo.Exploitation_Dossier` en production : la table peut avoir des colonnes obligatoires, triggers, relations ou contraintes metier non visibles dans cette fonctionnalite.

## 11. Tests frontend

Lancer le backend :

```powershell
cd C:\mcp\Vmind_Backend
npm run dev:http
```

Lancer le frontend :

```powershell
cd C:\mcp\Vmind_Front
npm run dev
```

Dans l'interface :

1. activer l'agent `VDATA` ;
2. cliquer sur `Compare Jan-Avr ?` ;
3. verifier que le message utilisateur affiche la question ;
4. verifier que la reponse affiche le badge `compare agency performance jan apr` ;
5. verifier les KPIs ;
6. verifier le graphique bar par agence ;
7. verifier le tableau mensuel par agence ;
8. verifier que les autres chips VDATA fonctionnent toujours.

## 12. Points de controle

- Aucun appel n8n n'est effectue pour cette chip.
- La route exige toujours `client_id`.
- La requete SQL est parametree.
- La notion agence est `ID_Site`.
- Le fallback prototype ne masque pas son statut : `raw.is_demo_data = true`.
- La reponse utilisateur n'affiche pas les details techniques internes : `details = null`.
- Le tool MCP utilise le meme service que la route HTTP.
