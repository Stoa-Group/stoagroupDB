# Backend Guide: Deals LTC, Column Data, Lead/Participant, and Misc Loans

This document is for the **backend agent** (or backend team). The Banking Dashboard is being updated with the following. The frontend will be implemented in parallel; these backend changes (and API contract) are needed for full functionality.

---

## 1. LTC (Original) – deal-wide, project-level

**Requirement:** One “LTC (Original)” value per **deal** (property/project). It represents the original LTC on the first loan at closing. Users need to **add/edit** this value and see it in the By Property table column “LTC (Original)”.

**Backend tasks:**
- Add a **project-level** field for original LTC, e.g. **`LTCOriginal`** (decimal, e.g. `0.65` for 65%). Store as decimal in DB and API.
- **GET** project (or banking/projects payload): include **`LTCOriginal`** (number or null) so the frontend can display it as a percentage and show it in the table.
- **PATCH/PUT** project: accept **`LTCOriginal`** (optional decimal or null) so the frontend can save it when the user adds or edits LTC.

**API contract:**
- Response: `LTCOriginal: number | null` (e.g. `0.65`).
- Request (update project): body may include `LTCOriginal: number | null`.
- Frontend will display the value as a percentage (e.g. 65%).

---

## 2. By Property table – maturity and index (no API change if data exists)

**Maturity:** The table column is now **“Maturity”** (not “I/O Maturity”). It should show the **active loan’s** primary maturity date (e.g. `IOMaturityDate`, or `MaturityDate`, or `PermPhaseMaturity` depending on loan type). The frontend will use whichever date the backend already returns for the active loan; no new fields required if loans already expose these dates.

**Index (fixed rate):** When the active loan is fixed rate, the frontend will show **“Fixed (IndexName) X.XX%”** (e.g. “Fixed (SOFR) 5.25%”) using:
- `FixedOrFloating` (to detect Fixed)
- `IndexName` (e.g. SOFR)
- `InterestRate` (or equivalent) for the total rate

Ensure **GET** loan(s) include **`FixedOrFloating`**, **`IndexName`**, and **`InterestRate`** (or the rate field you use) so the frontend can build this string.

---

## 3. Lead vs Participant – mutually exclusive per deal

**Requirement:** For each deal, there is **one lead bank** (flagged) and the rest are **participants**. A bank should never be shown as both “Lead” and “Participant” for the same deal (e.g. no “Lead, Participant” label).

**Backend tasks:**
- Ensure the data model enforces **one lead per deal** (e.g. one participation with `IsLead = true` per project, or a dedicated lead bank on the loan).
- **GET** participations (or bank/deal payload): for each deal, return a clear **lead** indicator (e.g. `IsLead: true` on exactly one participation per project). The frontend will display **“Lead”** when `IsLead === true` and **“Participant”** otherwise—never “Lead, Participant”.
- If the API currently returns both a “lender” and participations and the same bank can appear as both, document how the frontend should derive “Lead” vs “Participant” (e.g. “treat as Lead if bank is the loan’s lender; otherwise Participant”). The frontend will then show a single role per bank per deal.

---

## 4. Misc Loans – debt not tied to a deal (entities)

**Requirement:** Users need to track **debt that is not tied to a deal/project** but is tied to an **entity**. The dashboard will have a **“Misc Loans”** tab where:
- **Entities** are listed (these are not shown on the By Property tab).
- Each entity can have **loans** (same loan concept as deal loans, but linked to the entity instead of a project).

**Assumption (clarify if wrong):** Entities already exist in your system and may already have project IDs or a similar identifier. If so, loans can be linked to an entity via that ID (e.g. `ProjectId` pointing to an “entity” record, or an **`EntityId`** on the loan).

**Backend tasks:**
- **Option A – Same Loan table, optional project:**  
  - Allow **loans** with **no deal** (e.g. **`ProjectId`** null or optional).  
  - Add **`EntityId`** (or equivalent) to the Loan table so a loan can be tied to an **entity** instead of a project.  
  - **GET** list of **entities** (e.g. `GET /api/banking/entities` or similar) so the frontend can list them in the Misc Loans tab.  
  - **GET** loans for an entity (e.g. `GET /api/banking/loans/entity/:entityId` or `GET /api/banking/entities/:entityId/loans`).  
  - **POST** loan: allow creating a loan with **`EntityId`** and no **`ProjectId`** (or with `ProjectId` pointing to the entity’s project if you use one project per entity).

- **Option B – Entities as projects:**  
  - If “entities” are stored as projects (e.g. with a type/category like “Entity”), then:  
  - **GET** list of entity-projects (e.g. filter projects by type = Entity).  
  - **GET** loans for a project already supports `GET /api/banking/loans/project/:projectId`; use the same for entity-projects.  
  - **POST** loan: allow **`ProjectId`** to be an entity’s project ID so the loan is “standalone” relative to deal properties.

**API contract (to be finalized with your schema):**
- A way to **list entities** (or entity-projects) for the Misc Loans tab.
- A way to **list loans** for a given entity (or entity-project).
- **Create/update loan** with a link to an entity (via `EntityId` or entity’s `ProjectId`) instead of a deal project.

The frontend will add a **Misc Loans** main tab that lists entities and their loans once these endpoints (and payloads) are available. Until then, the tab may show a placeholder or “Coming soon” message.

**Create misc loan and create entity (Misc Loans section):**

The dashboard has a **“Create misc loan”** button in the Misc Loans view. This flow lets users create a loan linked to an entity (e.g. lines of credit, non–property debt). If the entity is not in the list, the user can create it from the same modal.

1. **Create new entity (when not in list)**  
   The frontend calls **POST /api/core/equity-partners** with:
   - `PartnerName` (required)
   - `PartnerType`: `"Entity"`
   - `InvestorRepId` (optional, PersonId from contacts)

   The backend should:
   - Create the equity partner and return `EquityPartnerId` (and optionally an `EntityId` if that is a separate concept).
   - Ensure that entities usable for misc loans are **included in GET /api/banking/entities** (e.g. include equity partners of type Entity in the banking entities list, or create/link a banking entity when an equity partner of type Entity is created). The frontend will add the new entity to the dropdown using the returned ID so the user can immediately create the loan.

2. **Create misc loan**  
   The frontend calls **POST /api/banking/loans** with either:
   - **Option A:** `EntityId` (and no `ProjectId`) to link the loan to an entity, or  
   - **Option B:** `ProjectId` set to the entity’s project ID (when entities are stored as projects).

   Other fields sent: `LenderId`, `LoanAmount`, `LoanPhase` (e.g. `"Other"`), `LoanClosingDate`, `MaturityDate`, `InterestRate`, `FixedOrFloating`, `Notes`, `IsActive: true`. The backend must accept **either** `EntityId` (for misc/entity loans) **or** `ProjectId` (for deal or entity-project loans), so that misc loans can be created without a deal `ProjectId`.

---

## 5. Loan creation – maturity type and labels

**Requirement:** When **creating** a loan (step-by-step flow), the user should be asked for **maturity details** and to **select the type** of maturity (e.g. I/O Maturity, Loan Maturity, Mini-Perm Maturity, Perm Phase Maturity). The form then shows the appropriate fields and labels for that type.

**Backend tasks:**
- No new fields required if loans already have: **`IOMaturityDate`**, **`MaturityDate`**, **`MiniPermMaturity`**, **`PermPhaseMaturity`** (or equivalents).
- **GET/POST/PUT** loan: continue to accept and return these date fields so the frontend can:
  - Let the user pick a maturity type.
  - Show the correct label (e.g. “I/O Maturity Date”, “Loan Maturity Date”) and persist the corresponding date field.

If maturity type is stored (e.g. “IOMaturity” vs “LoanMaturity”), expose it so the frontend can pre-fill the right label; otherwise the frontend can infer from which date field is populated.

---

## 6. Create loan (POST) – SQL Server OUTPUT and triggers

**Error:** `The target table 'banking.Loan' of the DML statement cannot have any enabled triggers if the statement contains an OUTPUT clause without INTO clause.`

**Cause:** SQL Server does not allow a bare `OUTPUT` clause (e.g. `OUTPUT INSERTED.LoanId`) on a table that has enabled triggers.

**Fix (choose one):**

- **Option A – OUTPUT INTO a table variable**  
  Capture the new ID into a table variable, then return it:
  ```sql
  DECLARE @Output TABLE (LoanId INT);
  INSERT INTO banking.Loan (...)
  OUTPUT INSERTED.LoanId INTO @Output(LoanId)
  VALUES (...);
  SELECT LoanId FROM @Output;
  ```
- **Option B – No OUTPUT; use SCOPE_IDENTITY()**  
  Run the INSERT without OUTPUT and return the new id with:
  ```sql
  INSERT INTO banking.Loan (...) VALUES (...);
  SELECT SCOPE_IDENTITY() AS LoanId;
  ```

After changing the INSERT to Option A or B, POST `/api/banking/loans` should return the new loan (or at least `LoanId`) and the 500 will stop.

---

## 7. Equity commitments – deal-wide with “paid off” flag

**Requirement:** Equity commitments are **deal-wide** (property/project level), not loan-specific. They should behave like the debt structure: one set of commitments per deal, with each commitment marked as **paid off or not** (same idea as debt items that are paid off).

**Backend changes:**

1. **Model equity commitments by deal only**
   - Equity commitments must be keyed by **ProjectId** (deal) only. Remove **LoanId** from the equity commitment table/API if it currently exists. There is no “equity commitment per loan”; there is only “equity commitment per deal.”
   - **GET** equity commitments: continue to support **by project** (e.g. `GET /api/banking/equity-commitments/project/:projectId`). Response should include all commitments for that deal.

2. **Add “paid off” (or equivalent) flag**
   - Add a field such as **`IsPaidOff`** or **`PaidOffDate`** (boolean or date, nullable) to each equity commitment record, so the UI can show paid-off vs outstanding like the debt structure tab.
   - **GET** responses: include this field. **PATCH/PUT** (update equity commitment): accept this field so the user can mark a commitment as paid off.

3. **Loan delete and copy-from**
   - **Loan delete:** Do **not** block deleting a loan because of equity commitments. Equity commitments are deal-wide; they are not tied to a specific loan. Only block delete when the loan has **covenants** or **guarantees** (and handle those per §8 below).
   - **Copy-from:** The copy-from endpoint (`POST /api/banking/loans/:targetLoanId/copy-from/:sourceLoanId`) should **no longer** accept or copy equity commitments. The request body should be **`{ copyCovenants: boolean, copyGuarantees: boolean }`** only. The frontend no longer sends `copyEquityCommitments`.

---

## 8. Loan delete – allow when only covenants/guarantees; do not block on equity

**Requirement:** A loan should be deletable unless it has **covenants** or **guarantees** tied to it. It must **not** be blocked because of equity commitments (equity is deal-wide; see §7).

**Backend options:**

- **Option A (recommended):** Allow DELETE when the loan has **no covenants and no guarantees**. Cascade-delete or reassign covenants and guarantees when deleting (e.g. delete them, or reassign to another loan on the same project). Do **not** block or cascade based on equity commitments.
- **Option B:** Allow DELETE and set FK to null on covenants/guarantees if schema allows. Again, do not block on equity.

The frontend calls `DELETE /api/banking/loans/:id`. The dashboard will show a message only when the backend returns an error mentioning covenants or guarantees.

---

## 9. Copy-from (Loan Creation Wizard) – copy guarantees when requested; no equity

**Requirement:** When the user creates a new loan and chooses to copy covenants and/or guarantees from an existing loan, the backend must copy **only** covenants and guarantees (not equity). When `copyGuarantees` is `true`, copy guarantees to the new loan; when `copyCovenants` is `true`, copy covenants. Equity commitments are not copied (they are deal-wide).

**Endpoint:** `POST /api/banking/loans/:targetLoanId/copy-from/:sourceLoanId`  
**Body:** `{ copyCovenants: boolean, copyGuarantees: boolean }` (no `copyEquityCommitments`)

**Backend task:** When `copyGuarantees` is `true`, create copies of all guarantees from the source loan and associate them with the target (new) loan ID. When `copyCovenants` is `true`, do the same for covenants. Ignore any legacy `copyEquityCommitments` in the body; do not copy equity.

**Copy-from 500 – "Invalid column name 'FinancingType'"**

When the frontend calls `POST /api/banking/loans/:targetLoanId/copy-from/:sourceLoanId`, the backend can return 500 with: *"Invalid column name 'FinancingType'."* The loan has already been created; the failure is in the copy step (covenants/guarantees).

**Fix:** The copy-from logic (e.g. INSERT … SELECT or stored procedure) is referencing a column **`FinancingType`** that does not exist on the target table(s)—likely the Guarantee and/or Covenant table. Either:

- **Remove** the `FinancingType` reference from the copy-from SQL/SP (if the column was renamed or dropped), or  
- **Add** a `FinancingType` column to the table(s) used when copying (if the column is required by the app and was never added to the schema).

After fixing the column reference, the copy-from endpoint should return 200 and the frontend will no longer show a copy failure.

---

## 10. Summary for API client (when you implement)

After implementation, the **api-client** (or API contract) should support:

- **Project:** `LTCOriginal` (decimal, optional) in GET and PATCH/PUT.
- **Loan:** `FixedOrFloating`, `IndexName`, `InterestRate` (or rate field) in GET; maturity date fields as already defined.
- **Participations / bank-deal payload:** One clear “lead” per deal (e.g. `IsLead`), so the UI can show “Lead” or “Participant” only.
- **Entities:** Endpoint(s) to list entities and to list (and create/update) loans per entity, as in section 4.

The frontend will **not** change the api-client; it will consume the above once the backend (and updated api-client) are provided.

---

## Implementation status

- **§1–§6:** LTC, maturity/index, lead, entities (Option B), loan maturity, create loan (SCOPE_IDENTITY) — implemented.
- **§7:** Equity commitments deal-wide: schema `add_equity_commitment_is_paid_off.sql` adds `IsPaidOff`; GET/POST/PUT equity commitment include/accept `IsPaidOff`. Loan delete does not touch equity. Copy-from no longer copies equity.
- **§8:** Loan delete cascades (guarantees, covenants, participations, etc.); does not delete or block on equity commitments.
- **§9:** Copy-from accepts only `copyCovenants` and `copyGuarantees`; ignores `copyEquityCommitments`; returns `{ copyCovenants, copyGuarantees }`.
- **§4 (Create entity):** `GET /api/banking/entities` returns `{ projects, entities }` (entity-projects plus equity partners with `PartnerType = 'Entity'`). Create entity via `POST /api/core/equity-partners` with `PartnerType: 'Entity'`.
