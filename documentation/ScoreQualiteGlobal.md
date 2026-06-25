# Score Qualité Global KPI Documentation

The **Score Qualité Global** widget displays the overall health score of the client operation, combining transit reliability and financial risk.

---

## 1. Technical Backend Workflow

### Endpoint Details
* **Route**: `/api/tools/get-score-global-vdata-kpi`
* **HTTP Method**: `POST`
* **Backend File**: [ScoreGlobalVdataKpi.ts](file:///c:/Users/melek/Desktop/Vmind_Backend/src/ScoreGlobalVdataKpi.ts)
* **Method Name**: `getScoreGlobalVdataKpi(client_id, dateStart, dateEnd)`

### Database Tables Used
* `dbo.OMC_Mouvement_planifies (MP)`: Planned shipment milestones.
* `dbo.Exploitation_DetailExpedition (DE)`: Active dispatch rows matching planned movements.
* `dbo.Exploitation_Dossier (D)`: Top-level folders.
* `dbo.OMC_Mouvement (OM)`: Operation movement requests.
* `dbo.Sales_Facture`: Invoiced financial entries.
* `dbo.vw_AI_Alerte_Factures_Impayees`: System view tracking open invoices.

### SQL Database Query
```sql
WITH Livraison AS
(
    SELECT
        COUNT(*) AS total_mouvements,
        SUM(CASE WHEN CONVERT(date, MP.DatePrevu) >= CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) AS mouvements_a_temps,
        SUM(CASE WHEN CONVERT(date, MP.DatePrevu) < CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) AS mouvements_en_retard,
        CAST(
            CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE 100.0 * SUM(CASE WHEN CONVERT(date, MP.DatePrevu) >= CONVERT(date, OM.Date_Demande) THEN 1 ELSE 0 END) / COUNT(*)
            END
        AS DECIMAL(10,2)) AS taux_livraison
    FROM OMC_Mouvement_planifies MP
    LEFT JOIN Exploitation_DetailExpedition DE ON DE.ID = MP.ID_sousDossier
    INNER JOIN Exploitation_Dossier D ON D.ID = DE.ID_Dossier
    LEFT JOIN OMC_Mouvement OM ON OM.ID = MP.ID_Mouvement
    WHERE MP.ID_Mouvement IS NOT NULL
      AND OM.ID IS NOT NULL
      AND OM.ID_Nature_Operation = 2
      AND MP.DatePrevu IS NOT NULL
      AND OM.Date_Demande IS NOT NULL
      AND OM.Date_Demande >= @startOfPeriod
      AND OM.Date_Demande <= @endOfPeriod
),
Facturation AS
(
    SELECT
        COUNT(*) AS nombre_factures,
        SUM(ISNULL(TotalTTC,0)) AS montant_total_facture
    FROM Sales_Facture
    WHERE DateFacture >= @startOfPeriod
      AND DateFacture <= @endOfPeriod
),
Impayes AS
(
    SELECT
        COUNT(*) AS nombre_factures_impayees,
        SUM(ISNULL(montant_TTC,0)) AS montant_total_impaye
    FROM vw_AI_Alerte_Factures_Impayees
    WHERE TRY_CONVERT(date, date_facture, 103) >= @startOfPeriod
      AND TRY_CONVERT(date, date_facture, 103) <= @endOfPeriod
)
SELECT
    L.total_mouvements,
    L.mouvements_a_temps,
    L.mouvements_en_retard,
    L.taux_livraison,
    F.nombre_factures,
    F.montant_total_facture,
    I.nombre_factures_impayees,
    I.montant_total_impaye,
    CAST(
        CASE
            WHEN ISNULL(F.montant_total_facture,0) = 0 THEN 0
            ELSE (ISNULL(I.montant_total_impaye,0) * 100.0) / F.montant_total_facture
        END
    AS DECIMAL(10,2)) AS taux_impayes
FROM Livraison L
CROSS JOIN Facturation F
CROSS JOIN Impayes I;
```

### Business Logic & Formula
1. **Taux Livraison à temps**: Percentage of completed operations met on or before requested date. If no data exists, defaults to `100%`.
2. **Score Impayés**: Calculated from the invoices table:
   $$\text{Taux Impayés} = \frac{\text{Montant total impayé}}{\text{Montant total facturé}} \times 100$$
   $$\text{Score Impayés} = 100 - \text{Taux Impayés}$$
3. **Score Qualité Global**: Computes the final weighted percentage:
   $$\text{Score Qualité Global} = (\text{Taux Livraison} \times 0.60) + (\text{Score Impayés} \times 0.40)$$
4. **Status Evaluation**:
   * $\ge 85\%$: **Excellent** (Success)
   * $\ge 70\%$: **Bon** (Warning)
   * $< 70\%$: **Critique** / **À surveiller** (Danger)

---

## 2. Frontend Widget Design & Consumption

### Component References
* **Container Widget**: [ScoreGlobalCard.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/ScoreGlobalCard.tsx)
* **Hover Tooltip flyout**: [ScoreGlobalTooltip.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/ScoreGlobalTooltip.tsx)

### Consumption
* Triggers API queries when VDATA agent is selected.
* Automatically queries the **previous year** (`currentYear - 1`, resolving to `2025`) using the date range `20250101` to `20251231` as a comparative baseline.
* The header displays `vs 2025 : [score]%`.

### UI Mockup Details & Aesthetics
* **Glassmorphism Styling**: Uses dynamic translucent `backgroundColor` (`rgba(6, 17, 31, 0.7)`), inset shadows, neon borders reflecting the status color, and a `backdropFilter: "blur(10px)"`.
* **Dynamic Speedometer Gauge (Tooltip)**:
  * Employs custom SVG `<circle>` vectors utilizing `strokeDasharray` and `strokeDashoffset` to animate the score progress bar from 0% to the final percentage over 1s.
  * Ticks ring (`strokeDasharray="1 5"`) drawing 90 speedometer ticks.
  * 3D glass shine layout curved vector path overlay.
  * Floating numeric count-up numbers separating integer and decimal sizes (larger integers, smaller decimals).
* **Breakdown Sub-Cards**:
  * Displays two sub-cards on the right: "Livraison" (60% weight, styled in neon green) and "Risk Financier" (40% weight, styled in neon yellow/orange).
  * Dynamic SVG accolade connector brackets linking the main gauge to the sub-cards with clear centering coordinates.
* **Details Table**:
  * Hosts a 9-column key data grid counting up from 0 to their actual values on hover.
