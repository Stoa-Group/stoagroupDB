# Upcoming Dates – Asana tasks not showing

If the **Upcoming Dates** tab shows deal dates but no **Asana** rows (and no 404 in the console), use this checklist.

---

## 1. Verify the API response

Open this URL in a browser (or use curl):

```
https://stoagroupdb-ddre.onrender.com/api/asana/upcoming-tasks?daysAhead=90
```

**If you see:**

- **`{"success":false,"error":{"message":"Asana unavailable"}}`**  
  Backend has no valid Asana auth. On **Render** → your Web Service → **Environment**:
  - Add **ASANA_ACCESS_TOKEN** (Personal Access Token from https://app.asana.com/0/my-apps), **or**
  - Use OAuth: **CLIENT_ID**, **CLIENT_SECRET**, and **REFRESH_TOKEN** (or **ASANA_REFRESH_TOKEN**).
  - Optionally set **ASANA_PROJECT_GID** to your Deal Pipeline project GID (default is `1207455912614114`).
  - Redeploy after changing env vars.

- **`{"success":true,"data":[]}`**  
  API is working but returned no projects/tasks. Either:
  - No tasks in the Deal Pipeline project have a **due date** in the next 90 days, or
  - **ASANA_PROJECT_GID** points to the wrong project. Confirm the GID in Asana (project URL or API).

- **`{"success":true,"data":[{"projectGid":"...","projectName":"...","tasks":[...]}]}`**  
  API is returning Asana tasks. If the app still shows no Asana rows, the **frontend** is not merging them (see step 2).

---

## 2. Frontend: merge Asana into Upcoming Dates

The app must:

1. Call **`API.getAsanaUpcomingTasks({ daysAhead: 90 })`** (after deal data and `summary.upcomingDates` are ready).
2. If `result.success && result.data && result.data.length > 0`:
   - For each `result.data` item, take `projectName` and each task in `tasks` (with `due_on`, `name`, `permalink_url`).
   - Build one row per task: `{ date, name: task.name, projectName, source: 'Asana', permalink_url: task.permalink_url }`.
   - **Merge** these rows with `summary.upcomingDates` (deal rows have `source: 'Deal'` or no source).
3. **Sort** the combined list by date.
4. Render the table with a **Source** column (Deal | Asana) and an **"Open in Asana"** link for rows where `source === 'Asana'` (use `permalink_url`).

Deal Pipeline project name matching (e.g. "Settlers Trace" ↔ "The Waters at Settlers Trace") can be done in the frontend when you want to associate Asana tasks to deals; for the Upcoming Dates list, showing all Deal Pipeline tasks is enough.

---

## 3. Quick API sanity check

- **Ping:** `GET https://stoagroupdb-ddre.onrender.com/api/asana`  
  Should return `{"ok":true,"message":"Asana API"}` if the Asana routes are deployed.
