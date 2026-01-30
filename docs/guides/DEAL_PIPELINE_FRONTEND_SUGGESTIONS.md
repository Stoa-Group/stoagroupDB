# Deal Pipeline – Frontend Implementation Suggestions

These are **suggestions only**. Implement them in your real frontend app (Domo, custom dashboard, etc.). Do **not** edit the reference files in `deal pipeline-FOR REFERENCE DO NOT EDIT/`.

---

## 1. Stage mapping (API → display)

- **Identified** → treat as **Prospective** (same bucket and filters).
- **LOI** → treat as **Prospective** (same bucket and filters).

So in your `normalizeStage()` (or equivalent), map `Identified` and `LOI` to `Prospective` before grouping/filtering.

---

## 2. Deals-by-stage order

Use this order everywhere (overview breakdown, list-by-stage view, stage filter dropdowns):

1. Prospective  
2. Under Review  
3. Under Contract  
4. Under Construction  
5. Stabilized  
6. Liquidated  
7. Commercial Land - Listed  
8. Rejected  
9. Dead  

Define a single constant (e.g. `STAGE_DISPLAY_ORDER`) and use it for:

- Ordering the “Deals by Stage” list.
- Ordering the “By Stage” list view sections.
- Ordering stage options in filter dropdowns.

That keeps the overview and list view aligned and consistent.

---

## 3. New stages (if your data has them)

If the API returns stages like **Under Review**, **Under Construction**, **Liquidated**, **Commercial Land - Listed**, **Rejected**, **Dead**, add them to:

- Your stage config (label + color/class).
- Your `STAGE_DISPLAY_ORDER` in the position above.
- Any `normalizeStage()` logic (e.g. “Under Construction” / “Started” → one display stage if you want to merge them).

---

## 4. Upcoming dates (optional enhancement)

- **Current behavior:** One “upcoming date” per deal (e.g. Start Date), “Next 10”, simple list.
- **Optional enhancement:**  
  - Use all relevant date fields from the API: `StartDate`, `DueDiligenceDate`, `ClosingDate`, `ExecutionDate`, `ConstructionLoanClosingDate`.  
  - For each, show **what the date is** (e.g. “Due Diligence”, “Closing”) and the date (e.g. “Due Diligence – Jan 15, 2025”).  
  - You can keep a cap (e.g. next 10) or show more and make the list scrollable.

Only do this if you want the richer “smartsheet-style” dates; otherwise keep the simple “Next 10” Start Date list.

---

## 5. List length and layout

- If “Upcoming Dates” or “Deals by Stage” feels cut off, consider:
  - Increasing `max-height` or removing it and using `overflow-y: auto` on a parent.
  - Or a “Show more” control.
- Keep “Deals by Stage” and the list-by-stage view using the **same** `STAGE_DISPLAY_ORDER` so columns/sections line up and don’t look sloppy.

---

## 6. API fields (for reference)

Deal pipeline API can return (among others):

- **Stage** – map Identified/LOI → Prospective as above.
- **StartDate**, **DueDiligenceDate**, **ClosingDate**, **ExecutionDate**, **ConstructionLoanClosingDate** – use for upcoming dates if you implement suggestion 4.
- **ProjectName**, **City**, **State**, **Region**, **Bank**, **UnitCount**, etc.

Use `api-client.js` and the Deal Pipeline API docs for the full list and for attachment endpoints (list/upload/download/delete).

---

## 7. "crypto is not defined" when viewing or downloading a file

In some environments (e.g. Domo custom app, embedded iframe, or strict mode), the global **`crypto`** is not in scope. If your code or a library uses `crypto.randomUUID()` or `crypto.subtle` for view/download, you’ll see **"crypto is not defined"**.

**Fix:** Use **`window.crypto`** (or **`globalThis.crypto`**) instead of bare `crypto`:

```javascript
// At top of script or before any use:
const crypto = typeof window !== 'undefined' && window.crypto
  ? window.crypto
  : (typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : null);

// Then use crypto for UUIDs (e.g. React keys, download links):
if (crypto && crypto.randomUUID) {
  const id = crypto.randomUUID();
} else {
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
}
```

For **downloading with auth:** don’t open the raw URL in a new tab (the tab won’t send your `Authorization` header). Use **fetch with the Bearer token**, then create a blob URL:

```javascript
async function downloadAttachment(attachmentId, token) {
  const url = `${API_BASE_URL}/api/pipeline/deal-pipeline/attachments/${attachmentId}/download`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(res.statusText);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'attachment';
  a.click();
  URL.revokeObjectURL(blobUrl);
}
```

---

## Summary

| Suggestion | What to do |
|-----------|------------|
| Identified / LOI | Map both to Prospective in your stage normalization. |
| Stage order | Use the 9-stage order above everywhere (breakdown, list, filters). |
| New stages | Add Under Review, Under Construction, Liquidated, Commercial Land - Listed, Rejected, Dead to config and order. |
| Upcoming dates | Optional: use all date fields and show label + date; otherwise keep “Next 10” Start Date. |
| Layout | Same stage order in overview and list; extend/scroll lists if needed. |
| "crypto is not defined" on view/download | Use `window.crypto` or `globalThis.crypto`; download via fetch + Bearer token + blob URL. |

Implement these in your **actual** frontend only; leave the `deal pipeline-FOR REFERENCE DO NOT EDIT/` folder unchanged.
