# Domo DataSet Names and Descriptions

Use these names and descriptions when creating DataSets in Domo for each table.

## CORE SCHEMA

### 1. Projects
**DataSet Name:** `STOA - Projects`
**Description:** Master list of all Stoa projects. This is the source of truth with ProjectID as the anchor. Contains project name, location, city, state, region, units, product type, and stage.

**Query:**
```sql
SELECT * FROM core.Project ORDER BY ProjectName;
```

---

### 2. Banks
**DataSet Name:** `STOA - Banks`
**Description:** Reference table of all banks and lenders that Stoa works with. Used for construction financing, permanent financing, and participations.

**Query:**
```sql
SELECT * FROM core.Bank ORDER BY BankName;
```

---

### 3. People
**DataSet Name:** `STOA - People`
**Description:** List of people (guarantors, contacts) associated with Stoa projects. Includes Toby Easterly, Ryan Nash, and Saun Sullivan.

**Query:**
```sql
SELECT * FROM core.Person ORDER BY FullName;
```

---

### 4. Equity Partners
**DataSet Name:** `STOA - Equity Partners`
**Description:** Reference table of equity partners and investors.

**Query:**
```sql
SELECT * FROM core.EquityPartner ORDER BY PartnerName;
```

---

## BANKING SCHEMA

### 5. Loans
**DataSet Name:** `STOA - Loans`
**Description:** All loan records including construction loans, permanent financing, mini-perm, and land loans. Contains loan amounts, closing dates, interest rates, spreads, and maturity dates.

**Query:**
```sql
SELECT * FROM banking.Loan ORDER BY ProjectId, LoanPhase;
```

---

### 6. DSCR Tests
**DataSet Name:** `STOA - DSCR Tests`
**Description:** Debt service coverage ratio tests (1st, 2nd, 3rd) for each project. Includes test dates, projected interest rates, requirements, and projected values.

**Query:**
```sql
SELECT * FROM banking.DSCRTest ORDER BY ProjectId, TestNumber;
```

---

### 7. Covenants
**DataSet Name:** `STOA - Covenants`
**Description:** Loan covenants including occupancy requirements, liquidity covenants, and other loan terms. Contains covenant dates, requirements, and projected values.

**Query:**
```sql
SELECT * FROM banking.Covenant ORDER BY ProjectId;
```

---

### 8. Liquidity Requirements
**DataSet Name:** `STOA - Liquidity Requirements`
**Description:** Liquidity requirements for each project, including total amount and lending bank amount.

**Query:**
```sql
SELECT * FROM banking.LiquidityRequirement ORDER BY ProjectId;
```

---

### 9. Participations
**DataSet Name:** `STOA - Participations`
**Description:** Bank participation splits showing which banks participate in each loan and their percentage/exposure. Tracks paid-off participations.

**Query:**
```sql
SELECT * FROM banking.Participation ORDER BY ProjectId, BankId;
```

---

### 10. Guarantees
**DataSet Name:** `STOA - Guarantees`
**Description:** Personal guarantees by guarantors (Toby, Ryan, Saun) for each project. Includes guarantee percentages, amounts, and covenant notes.

**Query:**
```sql
SELECT * FROM banking.Guarantee ORDER BY ProjectId, PersonId;
```

---

### 11. Bank Targets
**DataSet Name:** `STOA - Bank Targets`
**Description:** Relationship and capacity information for targeted banks. Includes assets, exposure with Stoa, contacts, and comments about bank relationships.

**Query:**
```sql
SELECT * FROM banking.BankTarget ORDER BY BankId;
```

---

### 12. Equity Commitments
**DataSet Name:** `STOA - Equity Commitments`
**Description:** Equity commitments by project, including preferred and common equity. Contains funding dates, amounts, interest rates, and terms.

**Query:**
```sql
SELECT * FROM banking.EquityCommitment ORDER BY ProjectId;
```

---

## PIPELINE SCHEMA

### 13. Under Contract
**DataSet Name:** `STOA - Under Contract`
**Description:** Properties currently under contract. Includes execution dates, due diligence dates, closing dates, prices, acreage, and extension options.

**Query:**
```sql
SELECT * FROM pipeline.UnderContract ORDER BY ProjectId;
```

---

### 14. Commercial Listed
**DataSet Name:** `STOA - Commercial Listed`
**Description:** Commercial land properties that are listed for sale. Includes listed dates, prices, status (Available, Under Contract), and broker information.

**Query:**
```sql
SELECT * FROM pipeline.CommercialListed ORDER BY ProjectId;
```

---

### 15. Commercial Acreage
**DataSet Name:** `STOA - Commercial Acreage`
**Description:** Commercial land acreage details including location, acreage, square footage, and building footprint.

**Query:**
```sql
SELECT * FROM pipeline.CommercialAcreage ORDER BY ProjectId;
```

---

### 16. Closed Properties
**DataSet Name:** `STOA - Closed Properties`
**Description:** Properties that have been closed/purchased. Includes closing dates, prices, price per square foot, acreage, and purchasing entity information.

**Query:**
```sql
SELECT * FROM pipeline.ClosedProperty ORDER BY ProjectId;
```

---

## RECOMMENDED DATA REFRESH SCHEDULE

- **Projects, Banks, People, Equity Partners:** Daily (reference data, rarely changes)
- **Loans, DSCR Tests, Covenants, Liquidity, Participations, Guarantees:** Daily (banking data updates)
- **Bank Targets, Equity Commitments:** Weekly (relationship data, less frequent updates)
- **Under Contract, Commercial Listed, Commercial Acreage, Closed Properties:** Daily (pipeline data, active updates)

## NOTES

- All DataSets use `ProjectId` as the key to join with the Projects table
- Use the Projects DataSet as your primary dimension table
- Join other DataSets to Projects using `ProjectId` foreign key
- For Banking Dashboard, join: Projects + Loans + DSCR Tests + Participations + Guarantees
- For Portfolio Dashboard, join: Projects + Loans + Under Contract + Closed Properties

