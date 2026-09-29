# VDATA — Rapport d'activité mensuel PDF

## 1. Finalité

La suggestion **Rapport mensuel PDF ?** génère une synthèse managériale de l'activité TraLIS du mois courant.

- Appel Fast-Track direct, sans n8n.
- Endpoint : `POST /api/tools/generate-monthly-activity-report`.
- Tool MCP : `generate_monthly_activity_report`.
- Service : `generateMonthlyActivityReport(client_id)`.
- Sortie : réponse VMIND et PDF téléchargeable.

## 2. Période

La période est calculée dynamiquement par le backend :

```text
dateStart  = premier jour du mois courant, inclus
dateEnd    = premier jour du mois suivant, exclu
periodKey  = YYYY-MM
periodLabel = mois et année en français
```

Pour juin 2026 :

```text
dateStart = 20260601
dateEnd   = 20260701
periodKey = 2026-06
```

Log produit à chaque génération :

```text
[monthly-report] dateStart: 20260601, dateEnd: 20260701, client_id: DEMO
```

## 3. Sources et règles SQL

### Activité mensuelle

Source : `dbo.Exploitation_Dossier` filtrée sur `CreatedOnDate`.

Cette période représente une **cohorte de dossiers créés dans le mois**. TraLIS ne fournit pas de date de clôture exploitable dans `Exploitation_Dossier` ni dans les vues dossier. Le rapport n'utilise donc jamais `LastModifiedOnDate` comme fausse date de clôture.

Indicateurs :

- dossiers créés dans le mois ;
- dossiers de cette cohorte actuellement clôturés ;
- dossiers en cours ;
- dossiers facturés ;
- dossiers de cette cohorte clôturés non facturés ;
- taux de clôture de la cohorte ;
- poids, volume et valeur marchandise ;
- activité par `ID_Site`.

Les sommes physiques et financières sont converties en `decimal(18,2)`.

### Facturation mensuelle

Le nombre de dossiers facturés utilise la vraie date métier `dbo.Sales_Facture.DateFacture` :

```sql
COUNT(DISTINCT Sales_Facture.ID_Dossier)
```

Sont retenues uniquement les factures :

- `ID_TYPE = 1` (`Facture`) ;
- statut `En Cours` ou `Validée` (`ID_STATUS IN (2, 3)`) ;
- référence renseignée ;
- `DateFacture` comprise dans le mois courant.

Les avoirs, proformas et brouillons sont exclus. Un dossier possédant plusieurs factures dans le mois est compté une seule fois.

### Livraison

Sources :

- `dbo.OMC_Mouvement_planifies MP` ;
- `dbo.Exploitation_DetailExpedition DE` ;
- `dbo.Exploitation_Dossier d` ;
- `dbo.OMC_Mouvement OM`.

Conditions :

```sql
MP.ID_Mouvement IS NOT NULL
AND OM.ID IS NOT NULL
AND OM.ID_Nature_Operation = 2
AND MP.DatePrevu IS NOT NULL
AND OM.Date_Demande IS NOT NULL
```

Règle métier :

```sql
-- À temps
CONVERT(date, MP.DatePrevu) >= CONVERT(date, OM.Date_Demande)

-- En retard
CONVERT(date, MP.DatePrevu) < CONVERT(date, OM.Date_Demande)
```

`DateArrivee` et `DateArriveeReel` ne sont jamais utilisées.

### Types clients

`d.ID_TypeClient` est relié à `dbo.Tiers_Types.ID`. Le libellé vient de `Tiers_Types.Designation`.

Une valeur vide ou nulle devient **Type non renseigné**.

### Volume sur 12 mois

La série historique vient de `dbo.vw_AI_KPI_Exploitation` et de sa colonne `periode`. Le mois courant et les onze mois précédents sont toujours présents dans le graphique ; un mois absent dans la vue vaut zéro.

Les KPI du mois courant restent calculés directement depuis `Exploitation_Dossier`. La vue ne remplace pas la table pour les totaux du rapport.

## 4. Seuils

| Indicateur | Warning | Danger |
|---|---:|---:|
| Livraison à temps | `< 90 %` | `< 75 %` |
| Taux de retard | `>= 15 %` | `>= 30 %` |
| Clôturés non facturés / clôturés | `>= 10 %` | `>= 20 %` |
| Baisse mensuelle du volume | `<= -10 %` | `<= -20 %` |
| Taux de clôture | `< 80 %` | `< 60 %` |
| Baisse mensuelle d'une agence | `<= -10 %` | `<= -20 %` |

Une alerte agence demande au moins cinq dossiers le mois précédent afin d'éviter un signal basé sur un échantillon trop faible.

## 5. Statut global

- **Excellent** : données disponibles, aucune alerte et livraison à temps au moins égale à 95 %.
- **Stable** : aucun danger et au maximum un warning.
- **À surveiller** : un danger, plusieurs warnings ou absence complète de données.
- **Critique** : au moins deux dangers, livraison à temps sous 75 %, ou taux de retard d'au moins 30 %.

Une métrique sans dénominateur est affichée à `0` ou `0,00 %` pour simplifier la lecture managériale. Le résumé et les alertes précisent lorsqu'aucune donnée source n'est disponible.

## 6. Contenu PDF

Le PDF contient :

1. Couverture VMIND / VDATA et badge global.
2. Résumé exécutif en quatre phrases maximum.
3. Onze cartes KPI.
4. Analyse des mouvements de livraison.
5. Classement et graphique des retards par type client.
6. Graphique du volume sur douze mois.
7. Lecture par agence lorsqu'elle est disponible.
8. Points à surveiller avec explication et action.
9. Actions recommandées.
10. Sources, date de génération et pagination.

Le document est produit par Puppeteer depuis un template HTML/CSS autonome. Il ne charge aucune police, image ou bibliothèque depuis Internet.

## 7. Stockage et téléchargement

Configuration :

```env
MONTHLY_REPORTS_DIR=C:\mcp\Vmind_Backend\Rapports
VMIND_PUBLIC_API_URL=http://localhost:3001
```

Nom :

```text
RapportActivite-{client_id}-{periodKey}.pdf
```

Exemple :

```text
RapportActivite-DEMO-2026-06.pdf
```

Le PDF est d'abord écrit dans un fichier temporaire, puis renommé. Le téléchargement utilise :

```text
GET /api/reports/:filename
```

La route accepte seulement le format de nom attendu, empêche les traversées de chemin et retourne le fichier avec `Content-Disposition: attachment`.

Sous Windows, un PDF ouvert peut verrouiller le nom standard. Le backend réessaie automatiquement le remplacement puis, si le verrou persiste, génère une version horodatée comme `RapportActivite-DEMO-2026-06-1782200000000.pdf`. La réponse et le bouton utilisent toujours le nom réellement écrit.

## 8. Réponse VMIND

La réponse contient le contrat standard ainsi que trois champs optionnels :

```json
{
  "tool_used": "generate_monthly_activity_report",
  "kpis": [],
  "alerts": [],
  "report_url": "http://localhost:3001/api/reports/RapportActivite-DEMO-2026-06.pdf",
  "report_filename": "RapportActivite-DEMO-2026-06.pdf"
}
```

`VmindChat` copie explicitement `alerts`, `report_url` et `report_filename` dans `VmindMessage`. `StandardResponseRenderer` transmet ces champs à `MonthlyReportResultRenderer`, qui affiche trois KPI, trois alertes maximum et le bouton **Télécharger le rapport PDF**.

## 9. Test backend

```powershell
cd C:\mcp\Vmind_Backend
npm install
npm run build
npm run dev:http
```

Dans un second terminal :

```powershell
$body = @{ client_id = 'DEMO' } | ConvertTo-Json
$response = Invoke-RestMethod `
  -Uri 'http://localhost:3001/api/tools/generate-monthly-activity-report' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body

$response.data | ConvertTo-Json -Depth 12
Invoke-WebRequest -Uri $response.data.report_url -OutFile "$env:TEMP\rapport-vmind.pdf"
```

Vérifier :

- `wrapper.ok = true` ;
- `data.ok = true` ;
- `tool_used = generate_monthly_activity_report` ;
- le fichier existe dans `MONTHLY_REPORTS_DIR` ;
- le téléchargement répond `application/pdf` ;
- les bornes du log correspondent au mois courant.

## 10. Test frontend

```powershell
cd C:\mcp\Vmind_Front
npm run build
npm run dev
```

1. Ouvrir VMIND.
2. Sélectionner l'agent VDATA.
3. Cliquer sur **Rapport mensuel PDF ?**.
4. Vérifier l'absence d'appel n8n dans l'onglet Network.
5. Vérifier les trois KPI, les alertes et le bouton.
6. Cliquer sur le bouton et contrôler le PDF téléchargé.

## 11. Cas sans données

La base DEMO contrôlée en juin 2026 ne contient aucun dossier créé ni mouvement de livraison réalisé sur le mois.

Le résultat attendu est donc un rapport minimal contenant :

- statut **À surveiller** ;
- taux de clôture et livraison affichés à `0,00 %`, avec une explication d'absence de données ;
- alerte d'absence de dossiers ;
- alerte d'absence de mouvements de livraison ;
- historique sur douze mois lorsqu'il existe ;
- recommandations de contrôle de la saisie et des mouvements.

Aucune donnée prototype n'est injectée.

## 12. Tester avec une période historique sans modifier la base

La méthode recommandée consiste à forcer temporairement la période du rapport côté backend. Aucune ligne TraLIS n'est insérée, mise à jour ou supprimée.

Dans `Vmind_Backend/.env`, ajouter ou décommenter :

```env
NODE_ENV=development
VMIND_REPORT_TEST_PERIOD=2025-09
```

Redémarrer obligatoirement le backend après la modification :

```powershell
cd C:\mcp\Vmind_Backend
npm run dev:http
```

Puis cliquer normalement sur **Rapport mensuel PDF ?** dans VDATA.

Pour la base DEMO contrôlée, septembre 2025 contient :

- 22 dossiers créés ;
- 3 agences renseignées ;
- 8 mouvements de livraison réalisés ;
- 3 mouvements en retard ;
- 12 dossiers distincts facturés selon `Sales_Facture.DateFacture`.

Le fichier généré sera :

```text
RapportActivite-DEMO-2025-09.pdf
```

Le PDF porte la mention **Mode test historique** et la réponse du chat commence par `Mode test historique (2025-09)`.

Après le test, commenter ou supprimer la variable puis redémarrer le backend :

```env
# VMIND_REPORT_TEST_PERIOD=2025-09
```

Sans cette variable, le rapport revient automatiquement au mois courant.

Pour éviter toute utilisation accidentelle, `VMIND_REPORT_TEST_PERIOD` provoque une erreur lorsque `NODE_ENV=production`.
