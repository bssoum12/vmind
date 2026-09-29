# VMIND VDATA Agent KPI Documentation

Welcome to the technical documentation of the KPI and telemetry widgets integrated into the VMIND Client Right Panel when the **VDATA (Données & Analytics)** agent is active.

This documentation describes the data workflow from the SQL Server database tables, down to the Express HTTP routes in the Node.js backend, and finally to the React frontend components.

## Documentation Index

Each card and KPI has its own dedicated documentation file:

1. **[Score Qualité Global](file:///c:/Users/melek/Desktop/Vmind_Front/documentation/ScoreQualiteGlobal.md)**
   * Calculated quality score based on delivery performance (60% weight) and financial risk (40% weight).
2. **[Volume Dossiers](file:///c:/Users/melek/Desktop/Vmind_Front/documentation/VolumeDossiers.md)**
   * Year-to-date monthly volume chart compared with previous year performance.
3. **[Livraison à temps](file:///c:/Users/melek/Desktop/Vmind_Front/documentation/LivraisonATemps.md)**
   * Delivery performance rate, including transit times, objectives, and delayed log telemetry.
4. **[Vue multi-indicateurs](file:///c:/Users/melek/Desktop/Vmind_Front/documentation/VueMultiIndicateurs.md)**
   * Comprehensive operational statistics (Active, Closed, Sous Dossiers, Chargement) rendered as an animated radar spiderweb chart.
5. **[Dernier Rapport](file:///c:/Users/melek/Desktop/Vmind_Front/documentation/DernierRapport.md)**
   * Scanner interface downloading the most recently compiled PDF activity report.
6. **[Total Alertes](file:///c:/Users/melek/Desktop/Vmind_Front/documentation/TotalAlertes.md)**
   * Critical operational and technical alerts, highlighting ERP error logs and invalid records.
7. **[Performance par Domaine](file:///c:/Users/melek/Desktop/Vmind_Front/documentation/PerformanceParDomaine.md)**
   * Side-by-side agent performance breakdown summarizing global score, delivery rate, and payment status.

---

## Technical Stack Overview

### 1. Database Layer (MSSQL)
* Queries standard operations tables like `dbo.Exploitation_Dossier`, `dbo.OMC_Mouvement_planifies`, `dbo.Sales_Facture`, and log views.
* Implements dynamic date parameters using strings formatted as `YYYYMMDD` converted to `datetime` objects.

### 2. Backend API (Node.js & Express)
* Hosts API POST endpoints at `/api/tools/*` in the express server (`server-http.ts`).
* Forwards requests to individual utility helpers located in the backend's source folder (`Vmind_Backend/src/*`).

### 3. Frontend UI (Next.js & React)
* Components are located inside the frontend workspace under `features/right_panel/`.
* Combines glassmorphism aesthetics, neon color variables (`--cyan`, `--green`, `--amber`, `--red`), responsive sizing, and Framer Motion layout animations.
