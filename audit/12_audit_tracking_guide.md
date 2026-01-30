# Comprehensive Audit Tracking System Guide

## Database change policy

**All database changes** (schema, migrations, bulk data) must be documented with **who**, **when**, and **what** (from → to) in **`docs/DB_CHANGELOG.md`**. Row-level data changes are tracked automatically in `audit.AuditLog` and `audit.RecordHistory` (who/when/what).

---

## Overview

The audit tracking system automatically tracks **ALL changes** to **ALL tables** in your database. This allows you to:

- See what any data looked like at any point in time
- Track who made changes and when
- Answer questions like "What were the bank details for Project X 1 month ago?"
- Audit trail for compliance and debugging

## What Gets Tracked

### Automatically Tracked Tables

**CORE Schema:**
- `core.Project` - All project information
- `core.Bank` - Bank/lender information
- `core.Person` - Person/contact information
- `core.EquityPartner` - Equity partner information
- `core.ProductType` - Product type reference data
- `core.Region` - Region reference data

**BANKING Schema:**
- `banking.Loan` - All loan details
- `banking.DSCRTest` - DSCR test requirements
- `banking.Participation` - Bank participation splits
- `banking.Guarantee` - Guarantee information
- `banking.Covenant` - Covenant requirements
- `banking.LiquidityRequirement` - Liquidity requirements
- `banking.BankTarget` - Bank target information
- `banking.EquityCommitment` - Equity commitment details

**PIPELINE Schema:**
- `pipeline.UnderContract` - Under contract properties
- `pipeline.CommercialListed` - Commercial listed properties
- `pipeline.CommercialAcreage` - Commercial acreage
- `pipeline.ClosedProperty` - Closed properties

## How It Works

1. **Automatic Triggers**: Every table has an audit trigger that fires on INSERT, UPDATE, or DELETE
2. **Audit Log**: Individual column changes are logged in `audit.AuditLog`
3. **Record History**: Complete record snapshots are stored in `audit.RecordHistory` as JSON
4. **Project Linking**: All changes are linked to `ProjectId` when applicable for easy filtering

## Key Tables

### `audit.AuditLog`
Stores individual column-level changes:
- `TableName` - Which table changed
- `RecordId` - Which record changed
- `ColumnName` - Which column changed (NULL for INSERT/DELETE)
- `ChangeType` - INSERT, UPDATE, or DELETE
- `OldValue` / `NewValue` - The before/after values
- `ChangedBy` - Who made the change
- `ChangedAt` - When the change occurred
- `ProjectId` - Linked project (for easy filtering)

### `audit.RecordHistory`
Stores complete record snapshots:
- `RecordData` - Full record as JSON
- `ValidFrom` / `ValidTo` - Time period this snapshot was valid
- `ChangeType` - INSERT, UPDATE, or DELETE
- `ProjectId` - Linked project

## Common Queries

### 1. What were the bank details for a project 1 month ago?

```sql
DECLARE @ProjectId INT = 1;
DECLARE @AsOfDate DATETIME2(0) = DATEADD(month, -1, GETDATE());

SELECT 
    al.ChangedAt,
    al.TableName,
    al.ColumnName,
    al.OldValue,
    al.NewValue,
    al.ChangeType
FROM audit.AuditLog al
WHERE al.ProjectId = @ProjectId
  AND al.ChangedAt <= @AsOfDate
  AND al.SchemaName = 'banking'
ORDER BY al.ChangedAt DESC;
```

### 2. Get complete snapshot of a loan as of a specific date

```sql
DECLARE @LoanId INT = 1;
DECLARE @SnapshotDate DATETIME2(0) = DATEADD(month, -1, GETDATE());

SELECT * FROM audit.fn_GetRecordAsOfDate('banking', 'Loan', @LoanId, @SnapshotDate);
```

### 3. See all changes to a specific loan over time

```sql
DECLARE @LoanId INT = 1;

SELECT 
    al.ChangedAt,
    al.ColumnName,
    al.OldValue AS [Previous Value],
    al.NewValue AS [New Value],
    al.ChangedBy
FROM audit.AuditLog al
WHERE al.SchemaName = 'banking'
  AND al.TableName = 'Loan'
  AND al.RecordId = @LoanId
ORDER BY al.ChangedAt DESC;
```

### 4. See all changes for a project in the last 7 days

```sql
DECLARE @ProjectId INT = 1;

SELECT * FROM audit.fn_GetProjectChangeHistory(
    @ProjectId,
    DATEADD(day, -7, GETDATE()),
    GETDATE()
)
ORDER BY ChangedAt DESC;
```

### 5. See recent changes across all tables

```sql
SELECT * FROM audit.vw_RecentChanges
WHERE ChangedAt >= DATEADD(day, -7, GETDATE())
ORDER BY ChangedAt DESC;
```

### 6. Track when loan amounts changed for a project

```sql
DECLARE @ProjectId INT = 1;

SELECT 
    al.ChangedAt,
    al.RecordId AS LoanId,
    al.OldValue AS [Previous Loan Amount],
    al.NewValue AS [New Loan Amount],
    al.ChangedBy,
    l.LoanPhase,
    b.BankName
FROM audit.AuditLog al
JOIN banking.Loan l ON l.LoanId = al.RecordId
LEFT JOIN core.Bank b ON b.BankId = l.LenderId
WHERE al.ProjectId = @ProjectId
  AND al.TableName = 'Loan'
  AND al.ColumnName = 'LoanAmount'
ORDER BY al.ChangedAt DESC;
```

## Helper Functions

### `audit.fn_GetRecordAsOfDate(@SchemaName, @TableName, @RecordId, @AsOfDate)`
Returns the record snapshot as it existed at a specific date.

### `audit.fn_GetRecordChangeHistory(@SchemaName, @TableName, @RecordId)`
Returns all historical versions of a specific record.

### `audit.fn_GetProjectChangeHistory(@ProjectId, @StartDate, @EndDate)`
Returns all changes for a project (across all related tables) within a date range.

## Helper Views

### `audit.vw_RecentChanges`
Shows the most recent 1000 changes across all tables with helpful context.

## Performance Considerations

- Indexes are created on commonly queried columns (`ProjectId`, `ChangedAt`, `TableName`, `RecordId`)
- History tables use `ValidFrom`/`ValidTo` pattern for efficient point-in-time queries
- JSON storage in `RecordHistory` allows flexible querying without schema changes

## Maintenance

The audit system is fully automatic - no maintenance required. However:

- **Storage**: Audit logs will grow over time. Consider archiving old data periodically.
- **Performance**: Large audit tables may slow queries. Consider partitioning by date if needed.
- **Retention**: Decide on a retention policy (e.g., keep 2 years of history).

## Example Use Cases

1. **Compliance**: "Show me all changes to loan amounts for Project X in Q1 2024"
2. **Debugging**: "What changed on this loan between last week and today?"
3. **Reporting**: "What was the total exposure for all projects as of end of last quarter?"
4. **Audit Trail**: "Who changed the participation percentage and when?"
5. **Historical Analysis**: "How has the loan structure evolved for this project over time?"

## Installation

Run the comprehensive audit tracking script:

```sql
-- Run this script to set up audit tracking for all tables
-- File: audit/10_comprehensive_audit_tracking.sql
```

This will:
1. Create the audit schema and tables
2. Create triggers for all tables
3. Create helper functions and views
4. Start tracking changes immediately

## Notes

- Changes are tracked automatically - no code changes needed in your API
- The system captures who made the change (`ChangedBy`) - ensure your API sets this appropriately
- JSON storage in `RecordHistory` allows you to see the complete record state at any point in time
- All project-related changes are linked via `ProjectId` for easy filtering
