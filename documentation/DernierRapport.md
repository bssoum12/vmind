# Dernier Rapport Widget Documentation

The **Dernier Rapport** (Latest Monthly Activity Report) card checks for compiled client PDF activity documents in the reports directory and provides a one-click download/view link.

---

## 1. Technical Backend Workflow

### Endpoint Details
* **Route**: `/api/tools/get-latest-report`
* **HTTP Method**: `POST`
* **Backend File**: [monthlyActivityReport.ts](file:///c:/Users/melek/Desktop/Vmind_Backend/src/monthlyActivityReport.ts)
* **Method Name**: `getLatestMonthlyReport(clientId)`

### Filesystem Logic
* Queries the static files reports folder on the backend server.
* Uses Node.js `fs` to read directory files:
```typescript
const safeClientId = clientId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 50);
const files = fs.readdirSync(reportDirectory);

// Regex matching e.g. RapportActivite-DEMO-2026-06.pdf or RapportActivite-DEMO-2026-06-1778163537810.pdf
const pattern = new RegExp(`^RapportActivite-${safeClientId}-(\\d{4}-\\d{2})(?:-\\d{13})?\\.pdf$`);
```
* **Sorting & Identification**: Extracts modified timestamps using `fs.statSync(filePath).mtime` and sorts the list in descending order to isolate the most recently generated file.
* **Period Translation**: Parses the YYYY-MM code and converts it to formatted French month descriptions (e.g. `2026-06` translates to `Juin 2026`).
* **URL Generation**: Binds file routes to a public path on the express static folder at `/api/reports/:fileName`.

---

## 2. Frontend Widget Design & Consumption

### Component References
* **Container Widget**: [LatestReportCard.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/TableauCroiseKpi/LatestReportCard.tsx)

### UI Design & Aesthetics
* **Theme Color**: Uses translucent purple overlays (`rgba(123, 97, 255, 0.04)`) to match the document agent's styling color palette.
* **Corner Brackets**: Corner bracket frames glow in the signature purple theme color.
* **Hover Interaction**: Scales card slightly (`scale(1.005)`) and shifts background opacity to `0.85` with inset shadows and glowing text.
* **Card Details**:
  * Displays the target month description (e.g. `Juin 2026`).
  * Shows the timestamp detailing when the document was generated.
  * Direct clickable link containing a PDF icon that opens the file in a new tab.
