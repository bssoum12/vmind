# Livraison à temps KPI Documentation

The **Livraison à temps** (Delivery Rate) widget tracks delivery reliability, comparing actual transit arrival timestamps with requested dates.

---

## 1. Technical Backend Workflow

### Endpoint Details
* **Route**: `/api/tools/get-delivery-rate`
* **HTTP Method**: `POST`
* **Backend File**: [quality.ts](file:///c:/Users/melek/Desktop/Vmind_Backend/src/quality.ts)
* **Method Name**: `getDeliveryRate(client_id, startDate, endDate)`

### Database Tables Used
* `dbo.OMC_Mouvement_planifies (MP)`: Milestones plan tracking.
* `dbo.Exploitation_DetailExpedition (DE)`: Dispatch detail rows.
* `dbo.Exploitation_Dossier (d)`: Folders database.
* `dbo.OMC_Mouvement (OM)`: Operation requests containing delivery requested dates.
* `dbo.Tiers_Tiers (T)`: Client profile directory.

### SQL Database Query
```sql
SELECT
    COUNT(*) AS total_mouvements_realises,
    SUM(CASE WHEN CONVERT(date, MP.DatePrevu) >= CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) AS mouvements_a_temps,
    SUM(CASE WHEN CONVERT(date, MP.DatePrevu) < CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) AS mouvements_en_retard,
    CAST(
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE 100.0 * SUM(CASE WHEN CONVERT(date, MP.DatePrevu) >= CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) / COUNT(*)
        END AS decimal(5,2)
    ) AS taux_livraison_a_temps_pct
FROM OMC_Mouvement_planifies MP
LEFT JOIN Exploitation_DetailExpedition AS DE ON DE.ID = MP.ID_sousDossier
INNER JOIN dbo.Exploitation_Dossier AS d ON d.ID = DE.ID_Dossier
LEFT JOIN OMC_Mouvement AS OM ON OM.ID = MP.ID_Mouvement
LEFT JOIN Tiers_Tiers AS T ON (DE.ID_Expediteur = T.ID OR DE.ID_Destinataire_import = T.ID)
WHERE MP.ID_Mouvement IS NOT NULL
  AND OM.ID IS NOT NULL
  AND OM.ID_Nature_Operation = 2
  AND MP.DatePrevu IS NOT NULL
  AND OM.Date_Demande IS NOT NULL
  AND OM.Date_Demande >= @dateStart
  AND OM.Date_Demande <= @dateEnd;
```

---

## 2. Frontend Widget Design & Consumption

### Component References
* **Container Widget**: [DeliveryRateKpi.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/DeliveryRateKpi.tsx)
* **Hover Tooltip flyout**: [DeliveryRateTooltip.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/DeliveryRateTooltip.tsx)

### Date & Comparison Logic
* **Current Year Period**: Date inputs default to current year YTD range (`currentYear-01-01` to `today`).
* **Comparison baseline**: Queries the previous year (`currentYear - 1`, resolving to `2025`) using the date range `20250101` to `20251231`.
* **Tooltip Label**: Renders dynamically as `vs 2025 : [rate]%`.

### UI Mockup Details & Aesthetics
* **HUD Card Gauge**:
  * Displays a circular radial gauge showing the current delivery rate percentage.
  * Ticks ring speedo dials (`strokeDasharray="1.5 3.5"`).
  * Status capsule badge (`✅ OBJECTIF ATTEINT` in green when rate $\ge 90\%$, `⚠️ EN ALERTE` in red when rate $< 90\%$).
  * Displays delivery counters (`X / Y DOSSIERS`).
* **Interactive Tooltip**:
  * Speedometer gauge enlarged to `120px` with a shiny circular overlay.
  * Details layout showcasing "LIVRÉS À TEMPS" and "LIVRÉS EN RETARD" absolute count bars.
  * **Log des Retards**: Fetches and renders a database log table displaying the top 10 delayed dossiers, detailing Expedition reference, Plan date, requested Delivery date, and the delay status.
* **Viewport Safety**:
  * Employs viewport checks to detect window height overflows. If the card sits in the bottom half of the sidebar, the tooltip automatically shifts its coordinate anchors to open **bottom-up** instead of top-down, preventing screen edge clipping.
