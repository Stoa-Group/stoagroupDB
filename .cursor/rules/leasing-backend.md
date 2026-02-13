# Leasing backend: port from app.js, don't reinvent

When working on **leasing KPI or dashboard backend** (e.g. `api/src/services/leasingKpiService.ts`):

- **Source of truth**: Leasing velocity report **app.js** (same repo / Domo Dashboards). The backend uses the **same Domo data** (portfolio unit details, unit mix, leasing) and must use the **same rules**.
- **Do not** invent new formulas or logic. For any calculation (occupancy, leased, available, lookahead, velocity, avg rent, delta to budget, etc.):
  1. Find the corresponding logic in **leasing velocity report app.js** (e.g. `getCurrentOccupancyAndLeasedFromDetails`, `calculateOccupancyProjectionFromUnitMix`, `calculateAvailableUnitsFromDetails`, `weightedOccupiedAvgRent`, `calculateVelocityFromUnitDetails`).
  2. Port that logic into the backend so results match the frontend.
  3. In the backend, add a comment **Source: app.js &lt;functionName&gt;** (or equivalent) so future changes stay in sync.
- Existing comments in `leasingKpiService.ts` already reference app.js function names; keep or update them when changing code.
