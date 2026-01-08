# API Usage Examples

## 📝 Complete Examples for Each Entity

### Core Entities

#### 1. Create a Project
```bash
POST /api/core/projects
Content-Type: application/json

{
  "ProjectName": "The Heights at Picardy",
  "City": "Baton Rouge",
  "State": "LA",
  "Region": "Gulf Coast",
  "Location": "Baton Rouge, LA",
  "Units": 232,
  "ProductType": "Heights",
  "Stage": "Started",
  "EstimatedConstructionStartDate": "2024-02-01"
}
```

#### 2. Update a Project
```bash
PUT /api/core/projects/1
Content-Type: application/json

{
  "Units": 240,
  "Stage": "Stabilized"
}
```

#### 3. Create a Bank
```bash
POST /api/core/banks
Content-Type: application/json

{
  "BankName": "First National Bank",
  "City": "Baton Rouge",
  "State": "LA",
  "Notes": "Primary construction lender"
}
```

#### 4. Create a Person
```bash
POST /api/core/persons
Content-Type: application/json

{
  "FullName": "John Smith",
  "Email": "john.smith@example.com",
  "Phone": "225-555-1234"
}
```

---

### Banking Entities

#### 5. Create a Loan
```bash
POST /api/banking/loans
Content-Type: application/json

{
  "ProjectId": 1,
  "BirthOrder": 6,
  "LoanType": "LOC - Construction",
  "Borrower": "Stoa Development LLC",
  "LoanPhase": "Construction",
  "LenderId": 5,
  "LoanAmount": 15000000,
  "LoanClosingDate": "2024-01-15",
  "MaturityDate": "2025-12-31",
  "FixedOrFloating": "Floating",
  "IndexName": "SOFR",
  "Spread": "2.75%",
  "InterestRate": null,
  "ConstructionCompletionDate": "Dec-25",
  "LeaseUpCompletedDate": "Apr-26",
  "IOMaturityDate": "2025-06-30"
}
```

#### 6. Update a Loan
```bash
PUT /api/banking/loans/10
Content-Type: application/json

{
  "LoanAmount": 16000000,
  "MaturityDate": "2026-12-31",
  "Spread": "3.00%"
}
```

#### 7. Create a DSCR Test
```bash
POST /api/banking/dscr-tests
Content-Type: application/json

{
  "ProjectId": 1,
  "LoanId": 10,
  "TestNumber": 1,
  "TestDate": "2025-12-31",
  "ProjectedInterestRate": "5.50%",
  "Requirement": 1.25,
  "ProjectedValue": "1.35"
}
```

#### 8. Create a Participation
```bash
POST /api/banking/participations
Content-Type: application/json

{
  "ProjectId": 1,
  "LoanId": 10,
  "BankId": 5,
  "ParticipationPercent": "32.0%",
  "ExposureAmount": 4800000,
  "PaidOff": false,
  "Notes": "Lead bank participation"
}
```

#### 9. Create a Guarantee
```bash
POST /api/banking/guarantees
Content-Type: application/json

{
  "ProjectId": 1,
  "LoanId": 10,
  "PersonId": 3,
  "GuaranteePercent": 25.0,
  "GuaranteeAmount": 3750000,
  "Notes": "Personal guarantee"
}
```

#### 10. Create a Covenant
```bash
POST /api/banking/covenants
Content-Type: application/json

{
  "ProjectId": 1,
  "LoanId": 10,
  "CovenantType": "Occupancy",
  "CovenantDate": "2025-12-31",
  "Requirement": "90%",
  "ProjectedValue": "95%",
  "Notes": "Occupancy covenant"
}
```

#### 11. Create a Liquidity Requirement
```bash
POST /api/banking/liquidity-requirements
Content-Type: application/json

{
  "ProjectId": 1,
  "LoanId": 10,
  "TotalAmount": 2000000,
  "LendingBankAmount": 640000,
  "Notes": "Liquidity reserve requirement"
}
```

#### 12. Create a Bank Target
```bash
POST /api/banking/bank-targets
Content-Type: application/json

{
  "BankId": 5,
  "AssetsText": "$500M - $1B",
  "City": "Baton Rouge",
  "State": "LA",
  "ExposureWithStoa": 15000000,
  "ContactText": "John Doe, VP Lending",
  "Comments": "Strong relationship, capacity for additional deals"
}
```

#### 13. Create an Equity Commitment
```bash
POST /api/banking/equity-commitments
Content-Type: application/json

{
  "ProjectId": 1,
  "EquityPartnerId": 2,
  "EquityType": "Pref",
  "LeadPrefGroup": "Stoa Capital",
  "FundingDate": "2024-01-15",
  "Amount": 5000000,
  "InterestRate": "8%",
  "AnnualMonthly": "Annual",
  "BackEndKicker": "20%",
  "LastDollar": true,
  "Notes": "Preferred equity commitment"
}
```

---

### Pipeline Entities

#### 14. Create Under Contract
```bash
POST /api/pipeline/under-contracts
Content-Type: application/json

{
  "ProjectId": 1,
  "Location": "Foley, AL",
  "Region": "Gulf Coast",
  "Acreage": 15.5,
  "Units": 300,
  "Price": 5000000,
  "PricePerSF": 25.50,
  "ExecutionDate": "2024-01-10",
  "DueDiligenceDate": "2024-02-15",
  "ClosingDate": "2024-03-01",
  "PurchasingEntity": "Stoa Development LLC",
  "CashFlag": false,
  "OpportunityZone": true,
  "ExtensionNotes": "30-day extension option"
}
```

#### 15. Create Commercial Listed
```bash
POST /api/pipeline/commercial-listed
Content-Type: application/json

{
  "ProjectId": 2,
  "Location": "Baton Rouge, LA",
  "ListedDate": "2024-01-01",
  "Acreage": 20.0,
  "Price": 3000000,
  "Status": "Active",
  "DueDiligenceDate": "2024-02-01",
  "ClosingDate": null,
  "Owner": "ABC Land Holdings",
  "PurchasingEntity": null,
  "Broker": "XYZ Realty",
  "Notes": "Prime development site"
}
```

#### 16. Create Commercial Acreage
```bash
POST /api/pipeline/commercial-acreage
Content-Type: application/json

{
  "ProjectId": 3,
  "Location": "Mobile, AL",
  "Acreage": 25.0,
  "SquareFootage": 1089000,
  "BuildingFootprintSF": 200000
}
```

#### 17. Create Closed Property
```bash
POST /api/pipeline/closed-properties
Content-Type: application/json

{
  "ProjectId": 4,
  "Status": "Multifamily",
  "ClosingDate": "2023-12-15",
  "Location": "Gonzales, LA",
  "Address": "123 Main Street, Gonzales, LA 70737",
  "Acreage": 12.5,
  "Units": 336,
  "Price": 45000000,
  "PricePerSF": 150.00,
  "ActOfSale": "Act of Sale #12345",
  "DueDiligenceDate": "2023-11-01",
  "PurchasingEntity": "Stoa Development LLC",
  "CashFlag": false
}
```

---

## 🔄 Update Examples (Partial Updates)

You can update just the fields you want to change:

#### Update Project Units Only
```bash
PUT /api/core/projects/1
Content-Type: application/json

{
  "Units": 250
}
```

#### Update Loan Amount and Maturity
```bash
PUT /api/banking/loans/10
Content-Type: application/json

{
  "LoanAmount": 17000000,
  "MaturityDate": "2027-12-31"
}
```

#### Update Participation Paid Off Status
```bash
PUT /api/banking/participations/5
Content-Type: application/json

{
  "PaidOff": true
}
```

---

## 🎯 JavaScript/TypeScript Helper Functions

```javascript
// Helper function to create a project
async function createProject(projectData) {
  const response = await fetch('http://localhost:3000/api/core/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData)
  });
  return await response.json();
}

// Helper function to update a project
async function updateProject(projectId, updates) {
  const response = await fetch(`http://localhost:3000/api/core/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return await response.json();
}

// Usage
const newProject = await createProject({
  ProjectName: "The Heights at Picardy",
  City: "Baton Rouge",
  State: "LA",
  Units: 232
});

await updateProject(newProject.data.ProjectId, {
  Units: 240,
  Stage: "Stabilized"
});
```

---

## ⚠️ Important Notes

1. **Required Fields**: Check the schema for required fields. For example:
   - Projects require `ProjectName`
   - Loans require `ProjectId` and `LoanPhase`
   - Participations require `ProjectId` and `BankId`

2. **Foreign Keys**: Make sure referenced IDs exist:
   - `ProjectId` must exist in `core.Project`
   - `BankId` must exist in `core.Bank`
   - `PersonId` must exist in `core.Person`

3. **Date Format**: Use ISO format: `"YYYY-MM-DD"` (e.g., `"2024-01-15"`)

4. **Decimal Values**: Send as numbers, not strings (e.g., `15000000` not `"15000000"`)

5. **Bit/Boolean Fields**: Use `true` or `false` (e.g., `"PaidOff": true`)

6. **NULL Values**: Omit fields you don't want to set, or use `null` explicitly

