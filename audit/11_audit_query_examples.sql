-- ============================================================
-- AUDIT TRACKING QUERY EXAMPLES
-- Common queries to retrieve historical data
-- ============================================================

-- ============================================================
-- EXAMPLE 1: What were the bank details for a project 1 month ago?
-- ============================================================
-- This shows all banking-related changes (loans, participations, etc.) for a project

DECLARE @ProjectId INT = 1;  -- Replace with your ProjectId
DECLARE @AsOfDate DATETIME2(0) = DATEADD(month, -1, GETDATE());

-- Get all banking changes up to that date
SELECT 
    al.ChangedAt,
    al.TableName,
    al.ColumnName,
    al.OldValue,
    al.NewValue,
    al.ChangeType,
    al.ChangedBy,
    CASE 
        WHEN al.TableName = 'Loan' THEN 'Loan: ' + CAST(al.RecordId AS VARCHAR)
        WHEN al.TableName = 'Participation' THEN 'Participation: ' + CAST(al.RecordId AS VARCHAR)
        WHEN al.TableName = 'Guarantee' THEN 'Guarantee: ' + CAST(al.RecordId AS VARCHAR)
        WHEN al.TableName = 'BankTarget' THEN 'Bank Target: ' + CAST(al.RecordId AS VARCHAR)
        ELSE al.TableName + ': ' + CAST(al.RecordId AS VARCHAR)
    END AS RecordDescription
FROM audit.AuditLog al
WHERE al.ProjectId = @ProjectId
  AND al.ChangedAt <= @AsOfDate
  AND al.SchemaName = 'banking'
ORDER BY al.ChangedAt DESC;

-- ============================================================
-- EXAMPLE 2: Get complete snapshot of a loan as of a specific date
-- ============================================================
DECLARE @LoanId INT = 1;  -- Replace with your LoanId
DECLARE @SnapshotDate DATETIME2(0) = DATEADD(month, -1, GETDATE());

SELECT 
    rh.RecordData,  -- JSON representation of the entire loan record
    rh.ValidFrom,
    rh.ValidTo,
    rh.ChangedBy,
    rh.ChangeType
FROM audit.RecordHistory rh
WHERE rh.SchemaName = 'banking'
  AND rh.TableName = 'Loan'
  AND rh.RecordId = @LoanId
  AND rh.ValidFrom <= @SnapshotDate
  AND (rh.ValidTo IS NULL OR rh.ValidTo > @SnapshotDate)
ORDER BY rh.ValidFrom DESC;

-- ============================================================
-- EXAMPLE 3: See all changes to a specific loan over time
-- ============================================================
DECLARE @LoanId INT = 1;  -- Replace with your LoanId

SELECT 
    al.ChangedAt,
    al.ColumnName,
    al.OldValue AS [Previous Value],
    al.NewValue AS [New Value],
    al.ChangedBy,
    al.Application
FROM audit.AuditLog al
WHERE al.SchemaName = 'banking'
  AND al.TableName = 'Loan'
  AND al.RecordId = @LoanId
ORDER BY al.ChangedAt DESC;

-- ============================================================
-- EXAMPLE 4: See all participations for a project and their history
-- ============================================================
DECLARE @ProjectId INT = 1;  -- Replace with your ProjectId

SELECT 
    al.ChangedAt,
    al.ColumnName,
    al.OldValue,
    al.NewValue,
    al.ChangeType,
    b.BankName,
    p.ParticipationPercent,
    p.ExposureAmount
FROM audit.AuditLog al
JOIN banking.Participation p ON p.ParticipationId = al.RecordId
JOIN core.Bank b ON b.BankId = p.BankId
WHERE al.ProjectId = @ProjectId
  AND al.TableName = 'Participation'
ORDER BY al.ChangedAt DESC, al.RecordId;

-- ============================================================
-- EXAMPLE 5: See what changed in the last 7 days for a project
-- ============================================================
DECLARE @ProjectId INT = 1;  -- Replace with your ProjectId

SELECT * FROM audit.fn_GetProjectChangeHistory(
    @ProjectId,
    DATEADD(day, -7, GETDATE()),
    GETDATE()
)
ORDER BY ChangedAt DESC;

-- ============================================================
-- EXAMPLE 6: See all changes made by a specific user
-- ============================================================
DECLARE @UserName NVARCHAR(255) = 'api_user';  -- Replace with username

SELECT 
    al.ChangedAt,
    al.SchemaName,
    al.TableName,
    al.RecordId,
    al.ColumnName,
    al.OldValue,
    al.NewValue,
    al.ChangeType,
    al.ProjectId,
    p.ProjectName
FROM audit.AuditLog al
LEFT JOIN core.Project p ON p.ProjectId = al.ProjectId
WHERE al.ChangedBy = @UserName
ORDER BY al.ChangedAt DESC;

-- ============================================================
-- EXAMPLE 7: See what a project looked like at a specific point in time
-- ============================================================
DECLARE @ProjectId INT = 1;  -- Replace with your ProjectId
DECLARE @AsOfDate DATETIME2(0) = '2024-01-15';  -- Replace with your date

-- Get project snapshot
SELECT * FROM audit.fn_GetRecordAsOfDate('core', 'Project', @ProjectId, @AsOfDate);

-- Get all related records at that time
SELECT 
    rh.TableName,
    rh.RecordId,
    rh.RecordData,
    rh.ValidFrom,
    rh.ChangedBy
FROM audit.RecordHistory rh
WHERE rh.ProjectId = @ProjectId
  AND rh.ValidFrom <= @AsOfDate
  AND (rh.ValidTo IS NULL OR rh.ValidTo > @AsOfDate)
ORDER BY rh.TableName, rh.RecordId;

-- ============================================================
-- EXAMPLE 8: Track when loan amounts changed for a project
-- ============================================================
DECLARE @ProjectId INT = 1;  -- Replace with your ProjectId

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

-- ============================================================
-- EXAMPLE 9: See all changes to bank targets
-- ============================================================
SELECT 
    al.ChangedAt,
    al.ColumnName,
    al.OldValue,
    al.NewValue,
    al.ChangeType,
    b.BankName,
    bt.ExposureWithStoa
FROM audit.AuditLog al
JOIN banking.BankTarget bt ON bt.BankTargetId = al.RecordId
JOIN core.Bank b ON b.BankId = bt.BankId
WHERE al.TableName = 'BankTarget'
ORDER BY al.ChangedAt DESC;

-- ============================================================
-- EXAMPLE 10: Get complete change history for a record
-- ============================================================
DECLARE @RecordId INT = 1;  -- Replace with your record ID
DECLARE @TableName NVARCHAR(128) = 'Loan';  -- Replace with table name
DECLARE @SchemaName NVARCHAR(128) = 'banking';  -- Replace with schema name

SELECT * FROM audit.fn_GetRecordChangeHistory(@SchemaName, @TableName, @RecordId);

-- ============================================================
-- EXAMPLE 11: See recent changes across all tables (last 24 hours)
-- ============================================================
SELECT * FROM audit.vw_RecentChanges
WHERE ChangedAt >= DATEADD(hour, -24, GETDATE())
ORDER BY ChangedAt DESC;

-- ============================================================
-- EXAMPLE 12: Compare current vs. historical value for a specific field
-- ============================================================
DECLARE @ProjectId INT = 1;
DECLARE @ColumnName NVARCHAR(128) = 'LoanAmount';
DECLARE @AsOfDate DATETIME2(0) = DATEADD(month, -1, GETDATE());

-- Current value
SELECT 
    'Current' AS Status,
    l.LoanId,
    l.LoanAmount AS Value,
    GETDATE() AS AsOfDate
FROM banking.Loan l
WHERE l.ProjectId = @ProjectId

UNION ALL

-- Historical value (most recent change before @AsOfDate)
SELECT 
    'Historical' AS Status,
    al.RecordId AS LoanId,
    CAST(al.NewValue AS DECIMAL(18,2)) AS Value,
    al.ChangedAt AS AsOfDate
FROM audit.AuditLog al
WHERE al.ProjectId = @ProjectId
  AND al.TableName = 'Loan'
  AND al.ColumnName = @ColumnName
  AND al.ChangedAt <= @AsOfDate
  AND al.ChangedAt = (
      SELECT MAX(ChangedAt)
      FROM audit.AuditLog
      WHERE ProjectId = @ProjectId
        AND TableName = 'Loan'
        AND ColumnName = @ColumnName
        AND RecordId = al.RecordId
        AND ChangedAt <= @AsOfDate
  )
ORDER BY LoanId, AsOfDate DESC;
