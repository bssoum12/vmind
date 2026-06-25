# Volume Dossiers KPI Documentation

The **Volume Dossiers** widget monitors monthly operational workflow volumes for the client, displaying month-by-month trends, YTD totals, and previous year comparisons.

---

## 1. Technical Backend Workflow

### Endpoint Details
* **Route**: `/api/tools/get-dossier-volume-evolution`
* **HTTP Method**: `POST`
* **Backend File**: [volume.ts](file:///c:/Users/melek/Desktop/Vmind_Backend/src/volume.ts)
* **Method Name**: `getDossierVolumeEvolution(client_id, months)` (Default: `months = 12`, VDATA queries `months = 24`)

### Database Tables Used
* `dbo.vw_AI_KPI_Exploitation`: View aggregating monthly volumes, grouping by `periode` (format `YYYY-MM`) and listing `nb_dossiers`.

### SQL Database Query
```sql
SELECT 
    periode,
    SUM(nb_dossiers) as nb_dossiers
FROM dbo.vw_AI_KPI_Exploitation
WHERE periode >= @startMonth
GROUP BY periode
ORDER BY periode ASC;
```

### Gap Filling Logic
* The backend generates a sequential month array for the requested months (e.g. 24 months) and maps the query rows onto it, filling empty months with `0` so the line chart doesn't break on missing data dates.
* Month labels are formatted as `"Janv. 2026"`, `"Févr. 2026"`, etc. using `toLocaleString('fr-FR')`.

---

## 2. Frontend Widget Design & Consumption

### Component References
* **Container Widget**: [VolumeLineChart.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/VolumeLineChart.tsx)

### Date & Comparison Logic
* **No Manual Date Pickers**: Date range input inputs have been removed to maximize space and match the other indicators.
* **YTD Calculation**: Calculates the YTD sum of dossiers in the current year (`2026`) directly from the fetched `data` array.
* **Previous Year Comparison**: Calculates the total dossiers in the previous year (`2025`) by summing all 12 months in the dataset.
* **MO-M Comparison on Hover**:
  * Hovering over any monthly point on the chart shows a tooltip.
  * The tooltip queries the corresponding month of the previous year (by replacing `"2026"` with `"2025"` in the string label, e.g. `"avr. 2026"` -> `"avr. 2025"`) and calculates the value difference (e.g., `vs 2025 (avr.) : 10 (+2)`).

### UI Mockup Details & Aesthetics
* **Holographic Neon Path**:
  * Employs an SVG `<path>` with neon cyan stroke (`var(--cyan)`).
  * Uses a `<linearGradient>` under the line (`chart-glow`) to create a smooth semi-transparent fade under the curve.
  * Adds an SVG shadow filter (`#neon-glow`) to render a floating cyan aura behind the path.
* **Interactive Hover Grid**:
  * Plots circular dots for each month.
  * Overlays invisible `<rect>` slices across the chart width so users can easily hover anywhere in a month's column to snap the vertical guide line and display the tooltip.
* **X-Axis Timeline**:
  * Pre-populates all 12 months (January to December) of the current year. Future months are set to `0`.
  * The timeline labels render cleanly as `Jan` (January), `Jui` (July), and `Déc` (December) to align with a full-year calendar.
