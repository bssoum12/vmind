# Performance par Domaine Widget Documentation

The **Performance par Domaine** widget replaces the duplicate agent list in the right panel sidebar, summarizing key performance rates across business sectors in real-time.

---

## 1. Technical Backend Workflow

### Endpoint Consumption
Queries three backend endpoints concurrently to populate the respective domain progress scores:
1. **VDATA (Score qualité global)**: `/api/tools/get-score-global-vdata-kpi`
2. **VFIN (Score impayés)**: `/api/tools/get-score-global-vdata-kpi` (calculates `100 - tauxImpayes`)
3. **VMOVE (Taux livraison à temps)**: `/api/tools/get-delivery-rate`

### YTD Date Calculation
* Queries automatically use current year YTD range boundaries (e.g. `20260101` to `today` formatted as `YYYYMMDD`) to calculate performance.

---

## 2. Frontend Widget Design & Consumption

### Component References
* **Container File**: [RightPanel.tsx](file:///c:/Users/melek/Desktop/Vmind_Front/features/right_panel/RightPanel.tsx)

### UI Design & Animations
* **Row Elements**:
  * Displays row badges corresponding to the agent identifiers (`VD`, `VF`, `VM`).
  * Links to customized sub-labels:
    * `VD`: *Score qualité global*
    * `VF`: *Score impayés*
    * `VM`: *Taux de livraison à temps*
* **Fluid Loading Animation**:
  * Employs a React `requestAnimationFrame` frame loop that triggers on mount.
  * Animates the width of all domain progress bars from `0%` to their target percentages concurrently, providing a high-end HUD dashboard initialization effect.
* **Dynamic Colors**:
  * The progress bars use CSS gradients blending from the agent signature color to a health status color:
    * **Red**: Score $< 50\%$ (Critical alert, e.g., VMOVE's rate).
    * **Gold**: Score $\ge 50\%$ and $< 85\%$ (Warning).
    * **Green/Cyan**: Score $\ge 85\%$ (Healthy operation).
* **Interactive Assist Prompts**:
  * Clicking a row forwards a specialized analysis request payload to the conversational AI assistant input handler, prompting the agent to explain current performance stats for that domain.
