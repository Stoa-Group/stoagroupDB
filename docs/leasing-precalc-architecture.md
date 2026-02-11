# Leasing dashboard: precalculated backend and cache architecture

This doc describes the target architecture for the Leasing Velocity / Leasing Analytics Hub: **all calculations in the backend, precalculated and stored when data changes**, with the frontend only displaying cached results so the dashboard stays fast.

---

## Current state

- **Backend** (`stoagroupDB`): `GET /api/leasing/dashboard` returns a single payload built on demand from raw DB tables (UnitMix, Pricing, Recents, PortfolioUnitDetails, etc.) via `buildDashboardFromRaw()`. No precomputed cache tables.
- **Frontend** (Leasing Velocity Report `app.js`): When using the backend, it calls the dashboard API once and applies the payload with `applyBackendDashboard()`. Phase 2 (unit-level Domo fetches) is skipped when `window.__LV_DATA_FROM_BACKEND__` is set, and "Loading unit-level data…" is hidden.
- **Floor Plans / Rent Analytics / Historical Gross Rent**: These views need `unitmixStruct`, `pricingByPlan`, `pricingTS`, and `portfolioUnitDetails` for the selected property. If the backend payload has empty or mismatched data (e.g. property key normalization), the UI shows "No data available for Floor Plans" or "No data available for Rent Analytics".

---

## Fixes already in place (summary)

1. **RECENTS_LIMIT (and other limit) errors**  
   In `runRestOfPhase2`, limits are read from `window.__LV_RECENTS_LIMIT__` etc. with numeric fallbacks (500000 / 300000) so the code never references an undefined variable.

2. **Property key normalization for backend payload**  
   The backend builds `unitmixStruct` with **normalized** property keys (e.g. `THE WATERS AT MILLERVILLE`). The frontend now looks up by normalized key in `planUnitsMap` and `weightedRecentAvg` (`normProp(prop)` then fallback to `prop`) so Floor Plans and related views find data when the user selects a property by display name.

3. **UnitMix property column**  
   Backend `buildUnitMixStructure` uses `PropertyName` with a fallback to `Property` so unitmix works whether the dataset uses PropertyName or Property.

---

## Target architecture: precalculated and cached

Goal: **No “calculate as you go” on the frontend.** Recompute and store when source data changes (e.g. daily after sync); serve from cache so the dashboard is fast.

### 1. Cache tables (new)

- **Per-property cache**  
  Store one row (or a small set of rows) per property per “as-of” date with:
  - Precomputed KPIs (occupancy, leased %, delta to budget, etc.)
  - Serialized or relational blobs for: floor-plan list, plan-level units, historical gross rent series (pricingTS by plan), unitmix structure for that property, etc.
- **Dashboard-wide cache**  
  Optional: one “snapshot” row per build (e.g. per day) containing the full dashboard payload or references to per-property cache rows, so a single read can serve the whole dashboard.

Design choices to make:

- **Granularity**: One row per property per day vs. one JSON blob per property per day.
- **Retention**: How long to keep history (e.g. last 90 days of daily snapshots).
- **Schema**: New tables, e.g. `leasing.DashboardCache` (property, asOfDate, payload/json) and/or `leasing.PropertyMetrics` (property, asOfDate, kpi columns, json for charts).

### 2. When to recalculate

- **Trigger**: After each successful `sync-from-domo` (or after sync-check + sync for specific datasets). Optionally also on a schedule (e.g. daily) if data can change outside sync.
- **Job**: Run a “build dashboard cache” step that:
  1. Reads current raw tables (UnitMix, Pricing, Recents, PortfolioUnitDetails, Leasing, MMRData, etc.).
  2. Runs the same logic as `buildDashboardFromRaw()` (or an expanded version that outputs per-property + global).
  3. Writes to the cache table(s) (replace or upsert for “today” and optionally previous days).

### 3. Endpoints

- **Existing**: `GET /api/leasing/dashboard`  
  - **Option A**: Keep building on-the-fly from raw until cache exists; then switch to “read from cache only” or “prefer cache, fallback to build”.
- **New (recommended)**:
  - `GET /api/leasing/dashboard?from=cache` — read only from cache (fast; 404 or empty if not yet built).
  - `GET /api/leasing/dashboard?from=build` — current behavior (build from raw).
  - Default: try cache first, then build if cache miss.
- **Per-property (optional)**:
  - `GET /api/leasing/property/:propertyId/dashboard` — return precomputed payload for that property (and optionally global context) from cache. Enables very fast property switching without refetching the whole dashboard.

### 4. Frontend

- Single call to dashboard API (or per-property API when implemented). No Phase 2 Domo fetches when using backend.
- All Rent Analytics, Floor Plans, Historical Gross Rent, Tradeout, etc. are driven by the payload; ensure payload includes:
  - `unitmixStruct` (normalized keys)
  - `pricingByPlan`, `pricingTS`
  - `portfolioUnitDetails`
  - `recentsByPlan`, `leasingTS`, `utradeIndex`, etc.
- Frontend remains “dumb” display: no recalculation of KPIs or series; only render what the API returns.

### 5. Implementation order

1. **Short term**  
   - Confirm backend dashboard payload includes unitmix/pricing/portfolioUnitDetails for all properties that have data in raw tables.  
   - Ensure property names are normalized the same way in backend and frontend (already improved with `normProp` lookup).  
   - Verify “No data available” disappears when backend has data for that property (and that Domo sync actually populates UnitMix/Pricing for “The Waters at Millerville” etc.).

2. **Medium term**  
   - Add cache table(s) and a “build cache” job that runs after sync (and optionally on a schedule).  
   - Add `GET /api/leasing/dashboard?from=cache` and wire default to cache-first.  
   - Keep `buildDashboardFromRaw()` as fallback when cache is missing or stale.

3. **Later**  
   - Per-property endpoint and cache keys for even faster property switching.  
   - Historical snapshots (e.g. keep last N days of precomputed metrics for trend views).

---

## Why “No data available” can still appear

Even with the above fixes, the message can appear if:

1. **No unitmix/pricing/portfolioUnitDetails for that property**  
   Sync may not have pulled UnitMix or Pricing rows for “The Waters at Millerville” (e.g. Domo dataset filter, or column mapping so Property/PropertyName is null). Fix: verify Domo datasets and sync; ensure backend uses Property fallback for unitmix.

2. **Property name mismatch**  
   If the UI shows “The Waters at Millerville” but the backend only has a different spelling (e.g. “Waters at Millerville” or “THE WATERS AT MILLERVILLE”), normalization must match. Frontend now uses `normProp(prop)` for unitmix lookups so normalized backend keys are found.

3. **Empty payload**  
   If the dashboard API returns 200 but `unitmixStruct` or `pricingTS` is empty (e.g. no rows in UnitMix/Pricing tables), the frontend will show no data. Fix: ensure sync and build produce non-empty structures for every property that has MMR/Leasing data.

---

## References

- Backend: `api/src/services/leasingDashboardService.ts` (`buildDashboardFromRaw`), `api/src/controllers/leasingController.ts`, `api/src/routes/leasingRoutes.ts`.
- Frontend: Leasing Velocity Report `app.js` — `applyBackendDashboard`, `planUnitsMap`, `renderByPlan`, `renderCharts`, Phase 2 and `runRestOfPhase2`.
- Sync: `docs/leasing-sync-auto-run.md`, `scripts/cron-leasing-sync-node.js`.
