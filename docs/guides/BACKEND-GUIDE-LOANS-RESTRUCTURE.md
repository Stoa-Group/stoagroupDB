# Backend Guide: Loans Restructure (Multiple Loans per Property, Active/Paid Off, Floors/Ceilings)

This document is for the **backend agent** (or backend team). The Banking Dashboard "By Property" view is being restructured so that:

1. **By Property** has a single base view showing **active** financing (one row per property; columns like "Active Financing Lender", "Active Loan Closing", "Active Loan Amount").
2. When a property is expanded, the first tab is **"Loans"**. Admins can **add, edit, and delete** any number of loans per project. Each loan can be marked **active** or **paid off** (to support restructures and viewing current debt).
3. Each loan still has all current fields (Loan Phase, Lender, amounts, dates, index, spread, etc.) **plus interest rate floor and ceiling** (requested by the boss).

The frontend will be implemented in parallel; these backend changes are required for it to work.

---

## 1. Multiple loans per project (already supported?)

- The API already has `GET /api/banking/loans/project/:projectId` returning an array of loans and `POST /api/banking/loans` with `ProjectId`. Ensure that:
  - A project can have **multiple loans** (no unique constraint that limits to one Construction + one Permanent per project).
  - `GET /api/banking/loans/project/:projectId` returns **all** loans for the project, in a stable order (e.g. by `BirthOrder` or `LoanId`).

---

## 2. Loan status: Active vs Paid Off

- Add a way to mark a loan as **active** or **paid off** so the dashboard can:
  - Show "active" debt in the base view (e.g. one primary active loan per property for the summary columns).
  - List all loans in the Loans tab with active ones first and paid-off ones clearly labeled.

**Options:**

- **Option A (recommended):** Add a column **`IsActive`** (bit/boolean) to the Loans table. Default `1` (true) for new loans. When a loan is paid off or restructured, set `IsActive = 0`. The frontend will treat `IsActive = 1` as active and show those first; paid-off loans remain visible for history.
- **Option B:** Add a **`Status`** (or **`LoanStatus`**) column, e.g. `'Active' | 'PaidOff'`. Same idea, more extensible if you later add statuses like `'Restructured'`.

**API contract:**

- **GET** loan(s): include `IsActive` (or `Status`) in the response.
- **POST** create loan: accept optional `IsActive` (default `true`).
- **PUT** update loan: accept `IsActive` (or `Status`) so the UI can mark a loan as paid off.

---

## 3. Interest rate floor and ceiling

- Add two optional columns to the Loans table (or equivalent entity):
  - **`InterestRateFloor`** – e.g. numeric or string (e.g. "2.00%" or 2.0).
  - **`InterestRateCeiling`** – e.g. numeric or string (e.g. "8.50%" or 8.5).

- **API:** Include these in:
  - `GET /api/banking/loans` and `GET /api/banking/loans/project/:projectId` responses.
  - `POST /api/banking/loans` (optional body fields).
  - `PUT /api/banking/loans/:id` (optional body fields).

The frontend will display and edit them in the same loan form as the existing rate fields.

---

## 4. “Primary” or “display” active loan for summary (optional)

- The By Property **table** shows one row per property with columns like "Active Financing Lender", "Active Loan Closing", "Active Loan Amount". The frontend can derive these by:
  - Taking the **first active loan** (by `BirthOrder` or `LoanId`) for the project, or
  - Using a **primary** flag if you add one.

**Optional backend enhancement:** Add **`IsPrimary`** (bit/boolean) on Loans so that at most one loan per project is primary. If set, the dashboard can use that loan for the summary row; otherwise fall back to “first active loan.” Not strictly required for v1: frontend can use “first active loan” only.

---

## 5. Summary of backend tasks

| # | Task | Priority |
|---|------|----------|
| 1 | Ensure multiple loans per project are supported (no single-construction/single-permanent constraint). | Required |
| 2 | Add **IsActive** (or **Status**) to Loans; GET/POST/PUT support. | Required |
| 3 | Add **InterestRateFloor** and **InterestRateCeiling** to Loans; GET/POST/PUT support. | Required |
| 4 | (Optional) Add **IsPrimary** for summary row. | Optional |

---

## 6. Frontend behavior (for reference)

- **By Property base view:** Single set of columns: Property, Active Financing Lender, Active Loan Closing, Active Loan Amount (and any other “active” summary columns). Data source: first active loan for the project (or primary if present).
- **Equity view:** Unchanged (still a separate view in the switcher).
- **Detail – Loans tab:** First tab when expanding a property. Sub-tabs: one per loan (active first, then paid off). Each sub-tab shows full loan details (all current fields + floor/ceiling). Buttons: Add Loan, Edit Loan, Delete Loan, Mark Active/Paid Off.
- **Participations / Covenants / etc.:** Can remain keyed by `ProjectId` and optionally `LoanId` where relevant; no change to backend contract for this restructure.

Once the backend supports **IsActive** (or Status) and **InterestRateFloor** / **InterestRateCeiling**, the frontend can ship the full Loans tab and active-financing base view.
