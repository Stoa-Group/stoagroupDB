-- ============================================================
-- DOMO QUERIES FOR VIEWING HISTORICAL DATA
-- Use these queries to see what data looked like at any point in time
-- ============================================================

-- ============================================================
-- QUERY 1: Recent Changes (Last 30 days)
-- See all changes made in the last 30 days
-- ============================================================
SELECT 
    AuditLogId,
    TableName,
    RecordId,
    ColumnName,
    ChangeType,
    OldValue,
    NewValue,
    ChangedBy,
    ChangedAt,
    Application,
    ProjectName
FROM vw_RecentChanges
WHERE ChangedAt >= DATEADD(day, -30, GETDATE())
ORDER BY ChangedAt DESC;

-- ============================================================
-- QUERY 2: Project History - All Versions
-- See all historical versions of a specific project
-- ============================================================
-- Replace @ProjectId with the actual ProjectId you want to see
-- Example: To see all versions of "The Waters at Hammond" (ProjectId = 41)
SELECT 
    HistoryId,
    ProjectId,
    ProjectName,
    City,
    State,
    Region,
    Location,
    Units,
    ProductType,
    Stage,
    ValidFrom AS ChangedAt,
    ValidTo AS ValidUntil,
    ChangedBy,
    ChangeType,
    Application,
    CASE 
        WHEN ValidTo IS NULL THEN 'Current Version'
        ELSE 'Historical Version'
    END AS Status
FROM audit.ProjectHistory
WHERE ProjectId = 41  -- Change this to the ProjectId you want
ORDER BY ValidFrom DESC;

-- ============================================================
-- QUERY 3: Project as of Yesterday
-- See what a project looked like yesterday
-- ============================================================
SELECT 
    ProjectId,
    ProjectName,
    City,
    State,
    Region,
    Location,
    Units,
    ProductType,
    Stage,
    ValidFrom AS ChangedAt,
    ChangedBy,
    ChangeType
FROM dbo.fn_GetProjectAsOfDate(41, DATEADD(day, -1, GETDATE()));  -- Change ProjectId as needed

-- ============================================================
-- QUERY 4: Project as of Specific Date
-- See what a project looked like on a specific date
-- ============================================================
-- Example: See project as of January 1, 2025
SELECT 
    ProjectId,
    ProjectName,
    City,
    State,
    Region,
    Location,
    Units,
    ProductType,
    Stage,
    ValidFrom AS ChangedAt,
    ChangedBy,
    ChangeType
FROM dbo.fn_GetProjectAsOfDate(41, '2025-01-01');  -- Change ProjectId and date as needed

-- ============================================================
-- QUERY 5: All Changes for a Project
-- Complete change history for a specific project
-- ============================================================
SELECT 
    HistoryId,
    ProjectId,
    ProjectName,
    City,
    State,
    Region,
    Location,
    Units,
    ProductType,
    Stage,
    ValidFrom,
    ValidTo,
    ChangedBy,
    ChangeType,
    Application,
    Status
FROM dbo.fn_GetProjectChangeHistory(41)  -- Change ProjectId as needed
ORDER BY ValidFrom DESC;

-- ============================================================
-- QUERY 6: Changes to Specific Field (e.g., Units)
-- See all changes to a specific column
-- ============================================================
SELECT 
    al.AuditLogId,
    al.TableName,
    al.RecordId,
    al.ColumnName,
    al.ChangeType,
    al.OldValue,
    al.NewValue,
    al.ChangedBy,
    al.ChangedAt,
    al.Application,
    p.ProjectName
FROM audit.AuditLog al
LEFT JOIN core.Project p ON p.ProjectId = al.RecordId AND al.TableName = 'core.Project'
WHERE al.ColumnName = 'Units'  -- Change to any column name
  AND al.ChangedAt >= DATEADD(day, -90, GETDATE())  -- Last 90 days
ORDER BY al.ChangedAt DESC;

-- ============================================================
-- QUERY 7: Loan History - All Versions
-- See all historical versions of a loan
-- ============================================================
SELECT 
    HistoryId,
    LoanId,
    ProjectId,
    p.ProjectName,
    BirthOrder,
    LoanType,
    Borrower,
    LoanPhase,
    LoanAmount,
    LoanClosingDate,
    MaturityDate,
    FixedOrFloating,
    IndexName,
    Spread,
    ValidFrom AS ChangedAt,
    ValidTo AS ValidUntil,
    ChangedBy,
    ChangeType,
    Application,
    CASE 
        WHEN ValidTo IS NULL THEN 'Current Version'
        ELSE 'Historical Version'
    END AS Status
FROM audit.LoanHistory lh
LEFT JOIN core.Project p ON p.ProjectId = lh.ProjectId
WHERE lh.LoanId = 1  -- Change this to the LoanId you want
ORDER BY ValidFrom DESC;

-- ============================================================
-- QUERY 8: Changes by User/Application
-- See all changes made by Domo vs manual changes
-- ============================================================
SELECT 
    Application,
    ChangeType,
    COUNT(*) AS ChangeCount,
    MIN(ChangedAt) AS FirstChange,
    MAX(ChangedAt) AS LastChange
FROM audit.AuditLog
WHERE ChangedAt >= DATEADD(day, -30, GETDATE())
GROUP BY Application, ChangeType
ORDER BY ChangeCount DESC;

-- ============================================================
-- QUERY 9: Current vs Historical Comparison
-- Compare current value with value from yesterday
-- ============================================================
SELECT 
    p.ProjectId,
    p.ProjectName,
    -- Current values
    p.Units AS CurrentUnits,
    p.Stage AS CurrentStage,
    -- Yesterday's values
    hist.Units AS YesterdayUnits,
    hist.Stage AS YesterdayStage,
    -- Changes
    CASE 
        WHEN p.Units <> hist.Units OR (p.Units IS NULL AND hist.Units IS NOT NULL) OR (p.Units IS NOT NULL AND hist.Units IS NULL)
        THEN 'Changed'
        ELSE 'Same'
    END AS UnitsChanged,
    CASE 
        WHEN p.Stage <> hist.Stage OR (p.Stage IS NULL AND hist.Stage IS NOT NULL) OR (p.Stage IS NOT NULL AND hist.Stage IS NULL)
        THEN 'Changed'
        ELSE 'Same'
    END AS StageChanged
FROM core.Project p
CROSS APPLY dbo.fn_GetProjectAsOfDate(p.ProjectId, DATEADD(day, -1, GETDATE())) hist
WHERE p.ProjectId = 41;  -- Change ProjectId as needed

-- ============================================================
-- QUERY 10: Audit Log Summary (for Dashboard)
-- Summary of all changes for reporting
-- ============================================================
SELECT 
    CAST(ChangedAt AS DATE) AS ChangeDate,
    TableName,
    ChangeType,
    COUNT(*) AS NumberOfChanges,
    COUNT(DISTINCT RecordId) AS NumberOfRecordsChanged
FROM audit.AuditLog
WHERE ChangedAt >= DATEADD(day, -90, GETDATE())
GROUP BY CAST(ChangedAt AS DATE), TableName, ChangeType
ORDER BY ChangeDate DESC, TableName, ChangeType;

