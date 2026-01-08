# Complete API Reference - Update Any Data Point by ID

## 🎯 Quick Reference: Update ANY Field by ID

All update endpoints use `PUT` and accept partial updates. Just send the fields you want to change.

**Base URL:** `https://stoagroupdb.onrender.com`

---

## 📊 CORE ENTITIES

### Projects
```
PUT /api/core/projects/:id
```
**Update any field:**
- ProjectName, City, State, Region, Location
- Units, ProductType, Stage
- EstimatedConstructionStartDate

**Example:**
```javascript
await updateProject(4, {
  Units: 350,
  Stage: "Stabilized",
  City: "Lafayette"
});
```

### Banks
```
PUT /api/core/banks/:id
```
**Update any field:**
- BankName, City, State, Notes

**Example:**
```javascript
await updateBank(4, {
  Notes: "Updated relationship notes"
});
```

### Persons
```
PUT /api/core/persons/:id
```
**Update any field:**
- FullName

**Example:**
```javascript
await updatePerson(1, {
  FullName: "Toby Easterly"
});
```

### Equity Partners
```
PUT /api/core/equity-partners/:id
```
**Update any field:**
- PartnerName, ContactInfo, Notes

**Example:**
```javascript
await updateEquityPartner(1, {
  ContactInfo: "new@email.com"
});
```

---

## 💰 BANKING ENTITIES

### Loans
```
PUT /api/banking/loans/:id
```
**Update any field:**
- BirthOrder, LoanType, Borrower, LoanPhase
- LenderId, LoanAmount, LoanClosingDate, MaturityDate
- FixedOrFloating, IndexName, Spread, InterestRate
- MiniPermMaturity, MiniPermInterestRate
- PermPhaseMaturity, PermPhaseInterestRate
- ConstructionCompletionDate, LeaseUpCompletedDate
- IOMaturityDate, PermanentCloseDate, PermanentLoanAmount
- Notes

**Example - Update Interest Rate:**
```javascript
await updateLoan(4, {
  Spread: "0.75%",
  InterestRate: "SOFR + 0.75%"
});
```

**Convenience - Update by ProjectId:**
```
PUT /api/banking/loans/project/:projectId
```
```javascript
await updateLoanByProject(4, {
  Spread: "0.75%"
});
```

### Participations
```
PUT /api/banking/participations/:id
```
**Update any field:**
- ProjectId, LoanId, BankId
- ParticipationPercent, ExposureAmount
- PaidOff, Notes

**Example:**
```javascript
await updateParticipation(11, {
  ExposureAmount: 16000000,
  PaidOff: false
});
```

### Guarantees
```
PUT /api/banking/guarantees/:id
```
**Update any field:**
- ProjectId, LoanId, PersonId
- GuaranteePercent, GuaranteeAmount
- Notes

**Example:**
```javascript
await updateGuarantee(1, {
  GuaranteePercent: 50,
  GuaranteeAmount: 22849
});
```

### DSCR Tests
```
PUT /api/banking/dscr-tests/:id
```
**Update any field:**
- ProjectId, LoanId, TestNumber
- TestDate, ProjectedInterestRate
- Requirement, ProjectedValue

**Example:**
```javascript
await updateDSCRTest(1, {
  ProjectedValue: "1.25",
  Requirement: 1.20
});
```

### Covenants
```
PUT /api/banking/covenants/:id
```
**Update any field:**
- ProjectId, LoanId, CovenantType
- CovenantDate, Requirement
- ProjectedValue, Notes

**Example:**
```javascript
await updateCovenant(1, {
  ProjectedValue: "80%",
  Requirement: "50%"
});
```

### Liquidity Requirements
```
PUT /api/banking/liquidity-requirements/:id
```
**Update any field:**
- ProjectId, LoanId
- TotalAmount, LendingBankAmount

**Example:**
```javascript
await updateLiquidityRequirement(1, {
  TotalAmount: 6000000,
  LendingBankAmount: 2500000
});
```

### Bank Targets
```
PUT /api/banking/bank-targets/:id
```
**Update any field:**
- BankId, AssetsText, City, State
- ExposureWithStoa, ContactText, Comments

**Example:**
```javascript
await updateBankTarget(1, {
  ExposureWithStoa: 50000000,
  Comments: "Updated relationship status"
});
```

### Equity Commitments
```
PUT /api/banking/equity-commitments/:id
```
**Update any field:**
- ProjectId, EquityPartnerId, EquityType
- Amount, FundingDate, Notes

**Example:**
```javascript
await updateEquityCommitment(1, {
  Amount: 6000000,
  FundingDate: "2024-06-30"
});
```

---

## 🏗️ PIPELINE ENTITIES

### Under Contracts
```
PUT /api/pipeline/under-contracts/:id
```
**Update any field:**
- ProjectId, Location, Region, Acreage, Units
- Price, PricePerSF, ExecutionDate
- DueDiligenceDate, ClosingDate, PurchasingEntity
- CashFlag, OpportunityZone, ExtensionNotes

**Example:**
```javascript
await updateUnderContract(1, {
  Price: 11000000,
  ClosingDate: "2024-12-31"
});
```

### Commercial Listed
```
PUT /api/pipeline/commercial-listed/:id
```
**Update any field:**
- ProjectId, Location, Region, Acreage, Units
- Price, PricePerSF, ListedDate, Notes

**Example:**
```javascript
await updateCommercialListed(1, {
  Price: 5000000
});
```

### Commercial Acreage
```
PUT /api/pipeline/commercial-acreage/:id
```
**Update any field:**
- ProjectId, Location, Region, Acreage
- Price, PricePerAcre, ListedDate, Notes

**Example:**
```javascript
await updateCommercialAcreage(1, {
  Price: 2000000
});
```

### Closed Properties
```
PUT /api/pipeline/closed-properties/:id
```
**Update any field:**
- ProjectId, Location, Region, Acreage, Units
- Price, PricePerSF, ClosingDate, PurchasingEntity
- CashFlag, OpportunityZone, Notes

**Example:**
```javascript
await updateClosedProperty(1, {
  Price: 12000000
});
```

---

## 🔑 Finding IDs

To find IDs, use the GET endpoints or query the database:

```javascript
// Get all projects to find ProjectId
const projects = await getAllProjects();

// Get all loans to find LoanId
const loans = await getAllLoans();

// Get loans for a specific project
const projectLoans = await getLoansByProject(4);
```

---

## 💡 Common Patterns

### Update Loan Interest Rate
```javascript
await updateLoan(loanId, {
  Spread: "0.75%",
  InterestRate: "SOFR + 0.75%"
});
```

### Update Participation Amount
```javascript
await updateParticipation(participationId, {
  ExposureAmount: 16000000,
  ParticipationPercent: "32.5%"
});
```

### Update Guarantee
```javascript
await updateGuarantee(guaranteeId, {
  GuaranteePercent: 50,
  GuaranteeAmount: 25000
});
```

### Update DSCR Test
```javascript
await updateDSCRTest(testId, {
  ProjectedValue: "1.30",
  Requirement: 1.25
});
```

### Update Liquidity Requirement
```javascript
await updateLiquidityRequirement(reqId, {
  TotalAmount: 7000000,
  LendingBankAmount: 3000000
});
```

---

## ✅ All Update Endpoints Summary

| Entity | Endpoint | ID Field |
|--------|----------|----------|
| Project | `PUT /api/core/projects/:id` | ProjectId |
| Bank | `PUT /api/core/banks/:id` | BankId |
| Person | `PUT /api/core/persons/:id` | PersonId |
| Equity Partner | `PUT /api/core/equity-partners/:id` | EquityPartnerId |
| Loan | `PUT /api/banking/loans/:id` | LoanId |
| Loan (by Project) | `PUT /api/banking/loans/project/:projectId` | ProjectId |
| Participation | `PUT /api/banking/participations/:id` | ParticipationId |
| Guarantee | `PUT /api/banking/guarantees/:id` | GuaranteeId |
| DSCR Test | `PUT /api/banking/dscr-tests/:id` | DSCRTestId |
| Covenant | `PUT /api/banking/covenants/:id` | CovenantId |
| Liquidity Requirement | `PUT /api/banking/liquidity-requirements/:id` | LiquidityRequirementId |
| Bank Target | `PUT /api/banking/bank-targets/:id` | BankTargetId |
| Equity Commitment | `PUT /api/banking/equity-commitments/:id` | EquityCommitmentId |
| Under Contract | `PUT /api/pipeline/under-contracts/:id` | UnderContractId |
| Commercial Listed | `PUT /api/pipeline/commercial-listed/:id` | CommercialListedId |
| Commercial Acreage | `PUT /api/pipeline/commercial-acreage/:id` | CommercialAcreageId |
| Closed Property | `PUT /api/pipeline/closed-properties/:id` | ClosedPropertyId |

---

**Every single data point can be updated using its ID!** 🎯
