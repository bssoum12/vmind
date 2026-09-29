# Vue multi-indicateurs KPI Documentation

The **Vue multi-indicateurs** widget aggregates high-level operational metrics into a visual spiderweb radar chart and summary layout.

---

## 1. Technical Backend Workflow

### Endpoint Details
* **Route**: `/api/tools/get-tableau-croise-kpi-vdata`
* **HTTP Method**: `POST`
* **Backend File**: [TableauCroiseKpiVdata.ts](file:///c:/Users/melek/Desktop/Vmind_Backend/src/TableauCroiseKpiVdata.ts)
* **Method Name**: `getTableauCroiseKpiVdata(client_id, year, startDate, endDate)`

### Database Tables & Views Used
* `dbo.Exploitation_Dossier`: Top-level folder tracking (`active_folders`, `closed_folders`).
* `dbo.Exploitation_DetailExpedition`: Sub-folder tracking (`total_sous_dossiers`, `sous_dossiers_non_factures`).
* `dbo.Exploitation_vwContainerTrailerDashboard`: Loading units view (`unite_chargement_total`, `teu_total`, `remorque_total`).

### SQL Database Queries
```sql
SELECT
    -- Active dossiers
    (SELECT COUNT(*) FROM dbo.Exploitation_Dossier 
     WHERE (EstCloture = 0 OR EstCloture IS NULL) AND CreatedOnDate >= @startOfPeriod AND CreatedOnDate <= @endOfPeriod) AS active_folders,
    -- Closed dossiers
    (SELECT COUNT(*) FROM dbo.Exploitation_Dossier 
     WHERE EstCloture = 1 AND CreatedOnDate >= @startOfPeriod AND CreatedOnDate <= @endOfPeriod) AS closed_folders,
    -- Unbilled sous dossiers
    (SELECT COUNT(*) FROM dbo.Exploitation_DetailExpedition 
     WHERE (EstFacture = 0 OR EstFacture IS NULL) AND CreatedOnDate >= @startOfPeriod AND CreatedOnDate <= @endOfPeriod) AS sous_dossiers_non_factures,
    -- Total sous dossiers
    (SELECT COUNT(*) FROM dbo.Exploitation_DetailExpedition 
     WHERE CreatedOnDate >= @startOfPeriod AND CreatedOnDate <= @endOfPeriod) AS total_sous_dossiers,
    -- Cargo totals
    (SELECT ISNULL(SUM(ISNULL(NbRemorque, 0) + ISNULL(NbConteneurTotal, 0)), 0) 
     FROM dbo.Exploitation_vwContainerTrailerDashboard WHERE Annee = @selectedYear) AS unite_chargement_total,
    (SELECT ISNULL(SUM(ISNULL(NbTEU, 0)), 0) 
     FROM dbo.Exploitation_vwContainerTrailerDashboard WHERE Annee = @selectedYear) AS teu_total,
    (SELECT ISNULL(SUM(ISNULL(NbRemorque, 0)), 0) 
     FROM dbo.Exploitation_vwContainerTrailerDashboard WHERE Annee = @selectedYear) AS remorque_total;
```

---

## 2. Frontend Widget Design & Consumption

### Component References
* **Container Widget**: [MultiIndicatorsCard.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/MultiIndicatorsCard.tsx)
* **Hover Tooltip flyout**: [KpiTooltip.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/KpiTooltip.tsx)

### UI Design & Layout
* **Expanded Right Sidebar**: The right panel width expands to `390px` to accommodate the layout.
* **Side-by-Side Flex Layout**:
  * **Left Side**: Displays KPI cards list and date pickers.
  * **Right Side**: Mounts the interactive SVG radar chart.
* **Animated Spiderweb Radar Chart**:
  * Draws 6 spoke axes representing clock positions (0, 2, 4, 6, 8, 10).
  * Outlines concentric hexagons and circle rings with low-opacity cyber teal lines.
  * Features 4 morphing data polygons (Teal, Purple, Green, Amber) with independent, slow wave breathing animations run by a `requestAnimationFrame` render loop.
  * Interactive glowing vertex dots using SVG filters.
* **Date Range Controls**:
  * Side-by-side picker elements default-initialized to January 1st of the current year and today.
  * Input is click-only (`showPicker()`) to prevent direct typing errors.
* **Excel Multi-Sheet Export**:
  * Features an **Exporter vers Excel** button at the bottom of the tooltip.
  * Generates a multi-sheet `.xls` file containing:
    1. **Dossiers Actifs**
    2. **Dossiers Clôturés**
    3. **Sous Dossiers**: Highlights unbilled items with a red background (`#FFEAEA`) and billed items in green (`#EAF8EB`).
    4. **Unités de Chargement**: Highlights TEU counts in purple (`#F3E8FF`) and trailers in blue (`#E8F4F8`).
