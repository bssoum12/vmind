# Total Alertes KPI Documentation

The **Total Alertes** widget checks database tables to report system/ERP error logs and folders lacking expedition cargo lines.

---

## 1. Technical Backend Workflow

### Endpoint Details
* **Route**: `/api/tools/get-alerts-kpi-vdata`
* **HTTP Method**: `POST`
* **Backend File**: [AlertsKpiVdata.ts](file:///c:/Users/melek/Desktop/Vmind_Backend/src/AlertsKpiVdata.ts)
* **Method Name**: `getAlertsKpiVdata(client_id, startDate, endDate)`

### Database Tables Used
* `dbo.Framework_Log`: Global system events logging.
* `dbo.Exploitation_Dossier (D)`: Top-level folders.
* `dbo.Exploitation_DetailExpedition (E)`: Folder item detail cargo rows.

### SQL Database Query
```sql
WITH BugsERP AS
(
    SELECT COUNT(*) AS nombre_bugs_erp
    FROM [dbo].[Framework_Log]
    WHERE Type = 'Error'
      AND Created >= @startDate
      AND Created <= @endDate
),
DossiersSansMarchandise AS
(
    SELECT COUNT(*) AS nombre_dossiers_sans_marchandise
    FROM Exploitation_Dossier D
    WHERE D.CreatedOnDate >= @startDate
      AND D.CreatedOnDate <= @endDate
      AND NOT EXISTS
      (
          SELECT 1
          FROM Exploitation_DetailExpedition E		
          WHERE E.ID_Dossier = D.ID
      )
)
SELECT
    B.nombre_bugs_erp,
    D.nombre_dossiers_sans_marchandise,
    B.nombre_bugs_erp + D.nombre_dossiers_sans_marchandise AS total_alerts
FROM BugsERP B
CROSS JOIN DossiersSansMarchandise D;
```

---

## 2. Frontend Widget Design & Consumption

### Component References
* **Container Widget**: [AlertsCard.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/AlertsCard.tsx)
* **Hover Tooltip flyout**: [AlertsTooltip.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/AlertsTooltip.tsx)

### UI Design & Aesthetics
* **Corner Brackets**: Corner brackets glow in cyan (`#00f0ff`) over the card corners.
* **Telemetry Details**:
  * Displays a giant neon total count showing dynamic ease-out count-ups.
  * Heartbeat pulsing SVG wave layout showing activity tracking.
  * **Radar Scanner Sweep**: Features a rotating radar line overlay sweep drawn via SVG/CSS background keyframes.
  * Capsule warning alert footer (`⚠️ ALERTES DÉTECTÉES` in red warning states).
* **Hover Tooltip Breakdown**:
  * Splits into double columns: **Bugs ERP** (red badge, warning states) and **Dossiers sans marchandise** (cyan badge, invalid dossiers).
  * Unique hexagonal capsules housing custom bug and folder icons.
  * Real-time proportion loading bars matching the counts percentage.
* **Screen Boundary Shifts**:
  * Employs viewport measurements to identify bottom half placements. If true, changes position values to mount the tooltip **bottom-up** so details remain visible and clamp inside viewport borders safely.
