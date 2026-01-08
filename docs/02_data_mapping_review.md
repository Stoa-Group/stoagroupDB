# Data Mapping Review - What to Store vs Pull

## ✅ STORE IN DB (Original/Manual/Contractual Data)

### Banking Dashboard
- **Project/Borrower Name** → `core.Project.ProjectName` (unique, creates ProjectId)
- **Loan Type** → `banking.Loan.LoanType` (LOC - Construction, RLOC - Land, etc.)
- **Location** → `core.Project.Location` (full text: "Hammond, LA")
- **City** → `core.Project.City` (parsed from Location: "Hammond")
- **State** → `core.Project.State` (parsed from Location: "LA")
- **Region** → `core.Project.Region` (auto-set: NC/SC = "Carolinas", else = "Gulf Coast")
- **Product Type** → `core.Project.ProductType` (auto-set: "Heights", "Prototype" for Waters, "Flats")
- **# of Units** → `core.Project.Units` (planned/underwritten - NOT actual)
- **Construction Financing Lender** → `banking.Loan.LenderId` (FK to core.Bank)
- **Construction Loan Amount** → `banking.Loan.LoanAmount`
- **Construction Loan Closing** → `banking.Loan.LoanClosingDate`
- **Construction Completion Date** → `banking.Loan.ConstructionCompletionDate` (TEXT - "May-23", "Dec-25" - this is TARGET, not actual)
- **Lease-up Completed Date** → `banking.Loan.LeaseUpCompletedDate` (TEXT - "Apr-25" - this is TARGET, not actual)
- **Construction I/O Maturity** → `banking.Loan.IOMaturityDate`
- **Fixed/Floating, Index, Spread** → `banking.Loan.FixedOrFloating`, `IndexName`, `Spread`
- **Mini-Perm terms** → `banking.Loan.MiniPermMaturity`, `MiniPermInterestRate`
- **Perm-Phase terms** → `banking.Loan.PermPhaseMaturity`, `PermPhaseInterestRate`
- **DSCR Tests (1st, 2nd, 3rd)** → `banking.DSCRTest` table (test dates, requirements, projected rates - contractual)
- **Liquidity Requirements** → `banking.LiquidityRequirement` table
- **Occupancy Covenant** → `banking.Covenant` table (covenant date, requirement - contractual)
- **Permanent Financing** → `banking.Loan` table (separate row with FacilityType='Permanent')

### Participants
- **Project** → Links to `core.Project.ProjectId`
- **Participating Banks** → `banking.Participation.BankId`
- **Percentages** → `banking.Participation.ParticipationPercent` (store as text: "32.0%")
- **Exposure** → `banking.Participation.ExposureAmount`
- **Paid Off** → `banking.Participation.PaidOff` (bit)

### Contingent Liabilities
- **Property Name** → Links to `core.Project.ProjectId`
- **Guarantors** → `banking.Guarantee.PersonId` (Toby, Ryan, Saun)
- **Guaranty %** → `banking.Guarantee.GuaranteePercent`
- **Guaranty $** → `banking.Guarantee.GuaranteeAmount`
- **Covenants** → `banking.Guarantee.Notes` (text notes about covenant terms)

### Targeted Banks
- **Bank** → `core.Bank.BankName`
- **Assets** → `banking.BankTarget.AssetsText`
- **City, State** → `banking.BankTarget.City`, `State`
- **Exposure with Stoa** → `banking.BankTarget.ExposureWithStoa`
- **Contact** → `banking.BankTarget.ContactText`
- **Comments** → `banking.BankTarget.Comments` (relationship notes, capacity, etc.)

### Pipeline - Under Contract
- **Project Name** → `core.Project.ProjectName` (creates ProjectId)
- **Location** → `core.Project.Location` (full text: "Foley, AL")
- **City, State** → `core.Project.City`, `State` (parsed from Location)
- **Region** → `core.Project.Region` (auto-set: NC/SC = "Carolinas", else = "Gulf Coast")
- **Acreage, Units** → `pipeline.UnderContract.Acreage`, `Units`
- **Price, Sq. Ft. Price** → `pipeline.UnderContract.Price`, `PricePerSF`
- **Execution Date, DD, Closing** → `pipeline.UnderContract.ExecutionDate`, `DueDiligenceDate`, `ClosingDate`
- **Purchasing Entity, Cash, OZ** → `pipeline.UnderContract.PurchasingEntity`, `CashFlag`, `OpportunityZone`
- **Extension Notes** → `pipeline.UnderContract.ExtensionNotes`

### Pipeline - Commercial Listed
- **Listed Development** → `core.Project.ProjectName`
- **Location, Listed Date** → `pipeline.CommercialListed.Location`, `ListedDate`
- **Acreage, Price, Status** → `pipeline.CommercialListed.Acreage`, `Price`, `Status`
- **DD, Closing** → `pipeline.CommercialListed.DueDiligenceDate`, `ClosingDate`
- **Owner, Purchasing Entity, Broker** → `pipeline.CommercialListed.Owner`, `PurchasingEntity`, `Broker`
- **Notes** → `pipeline.CommercialListed.Notes`

### Pipeline - Commercial Acreage
- **Project** → `core.Project.ProjectName`
- **Location, Acreage** → `pipeline.CommercialAcreage.Location`, `Acreage`
- **Square Footage, Building Footprint** → `pipeline.CommercialAcreage.SquareFootage`, `BuildingFootprintSF`

### Pipeline - Closed Properties
- **Project Name** → `core.Project.ProjectName`
- **Status** → `pipeline.ClosedProperty.Status` (Multifamily, Commercial, etc.)
- **Closing Date** → `pipeline.ClosedProperty.ClosingDate`
- **Location, Address** → `pipeline.ClosedProperty.Location`, `Address`
- **Acreage, Units** → `pipeline.ClosedProperty.Acreage`, `Units`
- **Price, Price Per SF** → `pipeline.ClosedProperty.Price`, `PricePerSF`
- **Act of Sale, DD** → `pipeline.ClosedProperty.ActOfSale`, `DueDiligenceDate`
- **Purchasing Entity, Cash** → `pipeline.ClosedProperty.PurchasingEntity`, `CashFlag`

---

## ❌ DO NOT STORE (Pull from External Sources)

### From Procore:
- **% Complete** - Pull from Procore using Project Name (match by `core.Project.ProjectName`)
- **Actual Construction Start Date** - Pull from Procore
- **Actual Construction Completion Date** - Pull from Procore
- **Actual Lease-up Start Date** - Pull from Procore
- **Construction milestones (actual dates)** - Pull from Procore

### From RealPage:
- **% Occupied** - Pull from RealPage using Project Name (match by `core.Project.ProjectName`)
- **Actual NOI** - Pull from RealPage
- **Actual Average Rent** - Pull from RealPage
- **Actual DSCR (calculated from actuals)** - Compute in Domo from RealPage NOI + DB loan terms
- **Current FCF** - Pull from RealPage
- **Units (actual)** - Pull from RealPage (if different from planned)

**Note:** External system IDs (ProcoreProjectId, RealPagePropertyId, AsanaProjectId) are no longer stored in the database. Match by ProjectName when pulling data from external systems.

### Calculated/Derived (Compute in Domo/Views):
- **Exposure totals** - SUM of participation amounts
- **# of deals per bank** - COUNT DISTINCT projects
- **Debt Yield** - NOI / Loan Amount (NOI from RealPage, Loan from DB)
- **LTC/LTV** - Calculate from loan amount / project cost
- **Portfolio totals** - Aggregations across projects

---

## Key Principles

1. **ProjectID is the source of truth** - Every deal gets one unique ProjectId
2. **Store only what you control** - Loan terms, dates, amounts, contractual requirements
3. **Pull operational data** - % complete, % occupied, actual NOI come from Procore/RealPage
4. **Compute aggregations** - Exposure, totals, rollups computed in views/Domo
5. **Store targets/plans as text** - "May-23", "Dec-25" are target dates, not actuals
6. **Auto-populated fields** - City, State, Region, and ProductType are automatically set based on Location and ProjectName
7. **Match by ProjectName** - External systems (Procore, RealPage) should match to projects using ProjectName

## Recent Schema Updates

- ✅ **Removed external ID columns** - ProcoreProjectId, RealPagePropertyId, AsanaProjectId (no longer stored)
- ✅ **Added City, State parsing** - Automatically extracted from Location field
- ✅ **Added Region logic** - NC/SC = "Carolinas", all others = "Gulf Coast"
- ✅ **Added ProductType logic** - Auto-set based on ProjectName: "Heights" → "Heights", "Waters" → "Prototype", "Flats" → "Flats"
- ✅ **Added audit tracking** - All changes are automatically tracked in `audit.ProjectHistory` and `audit.AuditLog`

