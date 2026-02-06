# Asana Upcoming Tasks – Backend Guide

**This guide is the source of truth.** The backend (`api/src/controllers/asanaController.ts`, `api/src/routes/asanaRoutes.ts`) and `api-client.js` (`getAsanaUpcomingTasks`, `updateAsanaTaskDueDate`) are implemented to match it; follow any edits to this guide in the code.

This guide describes the API for **Asana tasks with due dates** from the **Deal Pipeline** project. The frontend uses this in **deal detail** to show start-date discrepancies and offer admin remedies; the **Upcoming Dates** table shows only internal (database) deal start dates.

---

## 1. Overview

- **Upcoming Dates table:** Shows only internal deal start dates from the database. A **Date Type** column is shown (e.g. "Start date"); there is no Source column and no Asana rows in this table. Copy under the title: internal deal start dates from the database; Date Type describes the date; click a row to open the deal; the detail view will flag Asana start date discrepancies when the API is available.
- **Deal detail:** When a deal is opened, the app calls `API.getAsanaUpcomingTasks({ daysAhead: 365 })`, finds a task whose name matches the deal name (normalize: lowercase, trim; match if equal or one contains the other), and compares:
  - **Database start date:** deal Start Date  
  - **Asana start date:** task `due_on`  
  If they differ, an **"Asana start date"** section appears with:
  - Message: "Database start date is X; Asana start date for this project is Y."
  - If not admin: only that message + "Only admins can correct dates."
  - If admin: two buttons:
    1. **Override Asana date with database date** → calls `API.updateAsanaTaskDueDate(taskGid, dbDate)` (backend implements this).
    2. **Override database date with Asana date** → calls existing `API.updateDealPipeline(dealPipelineId, { StartDate: asanaDate })`.
- **Scope:** Backend uses the Deal Pipeline project (`ASANA_PROJECT_GID`); optional query param `project` can override for upcoming-tasks.

---

## 2. Asana API Usage (Backend)

- **Read:** PAT or OAuth (refresh token); server-side only.
- **Write (remedy):** Same token; `PUT https://app.asana.com/api/1.0/tasks/{task_gid}` with body `{ "data": { "due_on": "YYYY-MM-DD" } }` to update a task’s due date.
- **Project:** Deal Pipeline project GID from env `ASANA_PROJECT_GID` (default `1207455912614114`).
- **Project details:** `GET .../projects/{project_gid}?opt_fields=name,gid`
- **Tasks:** `GET .../projects/{project_gid}/tasks` with `opt_fields=name,due_on,permalink_url,gid`, `completed_since=now`, and filter by `due_on` in range.
- **OAuth token refresh:** `POST https://app.asana.com/-/oauth_token` with `grant_type=refresh_token`, `client_id`, `client_secret`, `refresh_token`.
- **Rate limits:** 150 requests/minute; backend caches OAuth access token until near expiry.

---

## 3. API Endpoints

### 3.1 GET /api/asana/upcoming-tasks

**Query parameters (all optional):**

| Param     | Type   | Description |
|----------|--------|-------------|
| project  | string | Asana project GID. If omitted, backend uses `ASANA_PROJECT_GID` (Deal Pipeline). |
| daysAhead| number | Include tasks with `due_on` in the next N days (default 90; clamped 1–365). |

**Response shape:**

```json
{
  "success": true,
  "data": [
    {
      "projectGid": "1207455912614114",
      "projectName": "Deal Pipeline",
      "tasks": [
        {
          "gid": "1207757865676027",
          "name": "Start 2 Carolinas",
          "due_on": "2026-03-18",
          "permalink_url": "https://app.asana.com/..."
        }
      ]
    }
  ]
}
```

If the backend cannot reach Asana: `{ "success": false, "error": { "message": "Asana unavailable" } }`. The frontend then does not show Asana discrepancy in deal detail.

**Ping:** `GET /api/asana` → `{"ok":true,"message":"Asana API"}`.

### 3.2 PUT /api/asana/tasks/:taskGid/due-on (admin remedy)

Updates an Asana task’s due date. Used when admin clicks **Override Asana date with database date** in deal detail.

**URL:** `PUT /api/asana/tasks/:taskGid` (or `PUT /api/asana/tasks/:taskGid/due-on`).

**Body:** `{ "due_on": "YYYY-MM-DD" }`

**Response:**  
- Success: `{ "success": true, "data": { "gid": "...", "due_on": "YYYY-MM-DD" } }` (or minimal ok).  
- Failure: `{ "success": false, "error": { "message": "..." } }` (e.g. Asana unavailable or invalid task).

**Auth:** Should be restricted to admin (same as other write operations); frontend only shows the button to admins.

---

## 4. Environment (Backend)

**Option A – Personal Access Token**  
- **ASANA_ACCESS_TOKEN** or **ASANA_PAT:** Required. Create at https://app.asana.com/0/my-apps.

**Option B – OAuth**  
- **CLIENT_ID**, **CLIENT_SECRET**, **REFRESH_TOKEN** (or **ASANA_REFRESH_TOKEN**).

**Optional:** **ASANA_PROJECT_GID**, **ASANA_API_BASE**.

---

## 5. Frontend Usage

- **Upcoming Dates:** Table is database-only (Date Type column; no Asana merge). Copy: internal deal start dates; deal detail flags Asana discrepancies when API is available.
- **Deal detail:** Call `API.getAsanaUpcomingTasks({ daysAhead: 365 })`, match task by deal name (normalize, trim; equal or contains). Compare deal Start Date vs task `due_on`. If different, show Asana discrepancy section; if admin, show **Override Asana date** (calls `API.updateAsanaTaskDueDate(taskGid, dbDate)`) and **Override database date** (calls `API.updateDealPipeline(dealPipelineId, { StartDate: asanaDate })`).

---

## 6. Remedy Endpoints (Admin Only)

1. **Override Asana date with database date**  
   - Frontend: `API.updateAsanaTaskDueDate(taskGid, dueOn)` with `dueOn` as `YYYY-MM-DD`.  
   - Backend: `PUT /api/asana/tasks/:taskGid/due-on` (or `PUT .../tasks/:taskGid` with body `{ due_on }`); calls Asana `PUT /tasks/{task_gid}` with `{ data: { due_on } }`.

2. **Override database date with Asana date**  
   - Frontend: `API.updateDealPipeline(dealPipelineId, { StartDate: asanaDate })`.  
   - Backend: existing `PUT /api/pipeline/deal-pipeline/:id` with `StartDate` in body.
