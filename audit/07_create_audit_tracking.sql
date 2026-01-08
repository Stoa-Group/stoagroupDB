-- ============================================================
-- AUDIT TRACKING SYSTEM
-- Tracks all changes to database for historical viewing
-- Allows you to see what data looked like at any point in time
-- ============================================================

SET NOCOUNT ON;

-- Create audit schema
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'audit') 
    EXEC('CREATE SCHEMA audit');

-- ============================================================
-- AUDIT LOG TABLE
-- Stores all changes to all tables
-- ============================================================
IF OBJECT_ID('audit.AuditLog', 'U') IS NOT NULL DROP TABLE audit.AuditLog;
CREATE TABLE audit.AuditLog (
    AuditLogId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLog PRIMARY KEY,
    
    -- What changed
    TableName      NVARCHAR(128) NOT NULL,
    RecordId       INT NOT NULL,  -- The primary key of the changed record
    ColumnName     NVARCHAR(128) NULL,  -- NULL for INSERT/DELETE, specific column for UPDATE
    
    -- Change details
    ChangeType     NVARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    OldValue       NVARCHAR(MAX) NULL,
    NewValue       NVARCHAR(MAX) NULL,
    
    -- Who and when
    ChangedBy      NVARCHAR(255) NULL,  -- User/system that made the change
    ChangedAt      DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    
    -- Context
    Application    NVARCHAR(100) NULL,  -- 'Domo', 'Manual', 'API', etc.
    Notes          NVARCHAR(MAX) NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_Table_Record')
    CREATE INDEX IX_AuditLog_Table_Record ON audit.AuditLog(TableName, RecordId, ChangedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_ChangedAt')
    CREATE INDEX IX_AuditLog_ChangedAt ON audit.AuditLog(ChangedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_ChangedBy')
    CREATE INDEX IX_AuditLog_ChangedBy ON audit.AuditLog(ChangedBy);

-- ============================================================
-- HISTORY TABLES (Point-in-time snapshots)
-- ============================================================

-- Project History - stores complete snapshots of Project table
IF OBJECT_ID('audit.ProjectHistory', 'U') IS NOT NULL DROP TABLE audit.ProjectHistory;
CREATE TABLE audit.ProjectHistory (
    HistoryId      BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProjectHistory PRIMARY KEY,
    ProjectId      INT NOT NULL,
    
    -- All columns from core.Project
    ProjectName    NVARCHAR(255) NOT NULL,
    City           NVARCHAR(100) NULL,
    State          NVARCHAR(50) NULL,
    Region         NVARCHAR(50) NULL,
    Location       NVARCHAR(255) NULL,
    Units          INT NULL,
    ProductType    NVARCHAR(50) NULL,
    Stage          NVARCHAR(50) NULL,
    EstimatedConstructionStartDate DATE NULL,
    
    -- Audit info
    ValidFrom      DATETIME2(0) NOT NULL,
    ValidTo        DATETIME2(0) NULL,  -- NULL means current version
    ChangedBy      NVARCHAR(255) NULL,
    ChangeType     NVARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    Application    NVARCHAR(100) NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProjectHistory_Project_Valid')
    CREATE INDEX IX_ProjectHistory_Project_Valid ON audit.ProjectHistory(ProjectId, ValidFrom DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProjectHistory_ValidFrom')
    CREATE INDEX IX_ProjectHistory_ValidFrom ON audit.ProjectHistory(ValidFrom DESC);

-- Loan History
IF OBJECT_ID('audit.LoanHistory', 'U') IS NOT NULL DROP TABLE audit.LoanHistory;
CREATE TABLE audit.LoanHistory (
    HistoryId      BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LoanHistory PRIMARY KEY,
    LoanId         INT NOT NULL,
    ProjectId      INT NOT NULL,
    
    -- All columns from banking.Loan (abbreviated for space)
    BirthOrder     INT NULL,
    LoanType       NVARCHAR(100) NULL,
    Borrower       NVARCHAR(255) NULL,
    LoanPhase      NVARCHAR(30) NOT NULL,
    LenderId       INT NULL,
    LoanAmount     DECIMAL(18,2) NULL,
    LoanClosingDate  DATE NULL,
    MaturityDate   DATE NULL,
    FixedOrFloating NVARCHAR(20) NULL,
    IndexName      NVARCHAR(50) NULL,
    Spread         NVARCHAR(50) NULL,
    InterestRate   NVARCHAR(100) NULL,
    MiniPermMaturity DATE NULL,
    MiniPermInterestRate NVARCHAR(100) NULL,
    PermPhaseMaturity DATE NULL,
    PermPhaseInterestRate NVARCHAR(100) NULL,
    ConstructionCompletionDate NVARCHAR(20) NULL,
    LeaseUpCompletedDate NVARCHAR(20) NULL,
    IOMaturityDate DATE NULL,
    PermanentCloseDate DATE NULL,
    PermanentLoanAmount DECIMAL(18,2) NULL,
    Notes          NVARCHAR(MAX) NULL,
    
    -- Audit info
    ValidFrom      DATETIME2(0) NOT NULL,
    ValidTo        DATETIME2(0) NULL,
    ChangedBy      NVARCHAR(255) NULL,
    ChangeType     NVARCHAR(10) NOT NULL,
    Application    NVARCHAR(100) NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LoanHistory_Loan_Valid')
    CREATE INDEX IX_LoanHistory_Loan_Valid ON audit.LoanHistory(LoanId, ValidFrom DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LoanHistory_Project_Valid')
    CREATE INDEX IX_LoanHistory_Project_Valid ON audit.LoanHistory(ProjectId, ValidFrom DESC);

-- ============================================================
-- TRIGGER: Track Project Changes
-- ============================================================
GO
IF OBJECT_ID('trg_Project_Audit', 'TR') IS NOT NULL DROP TRIGGER trg_Project_Audit;
GO
CREATE TRIGGER trg_Project_Audit
ON core.Project
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ChangeType NVARCHAR(10);
    DECLARE @ChangedBy NVARCHAR(255) = SYSTEM_USER;
    DECLARE @ChangedAt DATETIME2(0) = SYSDATETIME();
    
    -- Handle INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @ChangeType = 'INSERT';
        
        -- Insert into history table
        INSERT INTO audit.ProjectHistory (
            ProjectId, ProjectName, City, State, Region, Location, Units,
            ProductType, Stage, EstimatedConstructionStartDate,
            ValidFrom, ValidTo, ChangedBy, ChangeType, Application
        )
        SELECT 
            ProjectId, ProjectName, City, State, Region, Location, Units,
            ProductType, Stage, EstimatedConstructionStartDate,
            @ChangedAt, NULL, @ChangedBy, @ChangeType, 'Domo'
        FROM inserted;
        
        -- Log to audit log
        INSERT INTO audit.AuditLog (TableName, RecordId, ColumnName, ChangeType, NewValue, ChangedBy, Application)
        SELECT 
            'core.Project',
            ProjectId,
            NULL,
            @ChangeType,
            'Record inserted: ' + ProjectName,
            @ChangedBy,
            'Domo'
        FROM inserted;
    END
    
    -- Handle UPDATE
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @ChangeType = 'UPDATE';
        
        -- Close previous history record
        UPDATE audit.ProjectHistory
        SET ValidTo = @ChangedAt
        WHERE ProjectId IN (SELECT ProjectId FROM inserted)
          AND ValidTo IS NULL;
        
        -- Insert new history record
        INSERT INTO audit.ProjectHistory (
            ProjectId, ProjectName, City, State, Region, Location, Units,
            ProductType, Stage, EstimatedConstructionStartDate,
            ValidFrom, ValidTo, ChangedBy, ChangeType, Application
        )
        SELECT 
            ProjectId, ProjectName, City, State, Region, Location, Units,
            ProductType, Stage, EstimatedConstructionStartDate,
            @ChangedAt, NULL, @ChangedBy, @ChangeType, 'Domo'
        FROM inserted;
        
        -- Log individual column changes
        INSERT INTO audit.AuditLog (TableName, RecordId, ColumnName, ChangeType, OldValue, NewValue, ChangedBy, Application)
        SELECT 
            'core.Project',
            i.ProjectId,
            'ProjectName',
            @ChangeType,
            CAST(d.ProjectName AS NVARCHAR(MAX)),
            CAST(i.ProjectName AS NVARCHAR(MAX)),
            @ChangedBy,
            'Domo'
        FROM inserted i
        INNER JOIN deleted d ON i.ProjectId = d.ProjectId
        WHERE i.ProjectName <> d.ProjectName OR (i.ProjectName IS NULL AND d.ProjectName IS NOT NULL) OR (i.ProjectName IS NOT NULL AND d.ProjectName IS NULL);
        
        INSERT INTO audit.AuditLog (TableName, RecordId, ColumnName, ChangeType, OldValue, NewValue, ChangedBy, Application)
        SELECT 
            'core.Project',
            i.ProjectId,
            'Units',
            @ChangeType,
            CAST(d.Units AS NVARCHAR(MAX)),
            CAST(i.Units AS NVARCHAR(MAX)),
            @ChangedBy,
            'Domo'
        FROM inserted i
        INNER JOIN deleted d ON i.ProjectId = d.ProjectId
        WHERE i.Units <> d.Units OR (i.Units IS NULL AND d.Units IS NOT NULL) OR (i.Units IS NOT NULL AND d.Units IS NULL);
        
        INSERT INTO audit.AuditLog (TableName, RecordId, ColumnName, ChangeType, OldValue, NewValue, ChangedBy, Application)
        SELECT 
            'core.Project',
            i.ProjectId,
            'Stage',
            @ChangeType,
            CAST(d.Stage AS NVARCHAR(MAX)),
            CAST(i.Stage AS NVARCHAR(MAX)),
            @ChangedBy,
            'Domo'
        FROM inserted i
        INNER JOIN deleted d ON i.ProjectId = d.ProjectId
        WHERE i.Stage <> d.Stage OR (i.Stage IS NULL AND d.Stage IS NOT NULL) OR (i.Stage IS NOT NULL AND d.Stage IS NULL);
        
        -- Update UpdatedAt column
        UPDATE core.Project
        SET UpdatedAt = @ChangedAt
        WHERE ProjectId IN (SELECT ProjectId FROM inserted);
    END
    
    -- Handle DELETE
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @ChangeType = 'DELETE';
        
        -- Close history record
        UPDATE audit.ProjectHistory
        SET ValidTo = @ChangedAt
        WHERE ProjectId IN (SELECT ProjectId FROM deleted)
          AND ValidTo IS NULL;
        
        -- Log deletion
        INSERT INTO audit.AuditLog (TableName, RecordId, ColumnName, ChangeType, OldValue, ChangedBy, Application)
        SELECT 
            'core.Project',
            ProjectId,
            NULL,
            @ChangeType,
            'Record deleted: ' + ProjectName,
            @ChangedBy,
            'Domo'
        FROM deleted;
    END
END;
GO

-- ============================================================
-- TRIGGER: Track Loan Changes
-- ============================================================
GO
IF OBJECT_ID('trg_Loan_Audit', 'TR') IS NOT NULL DROP TRIGGER trg_Loan_Audit;
GO
CREATE TRIGGER trg_Loan_Audit
ON banking.Loan
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ChangeType NVARCHAR(10);
    DECLARE @ChangedBy NVARCHAR(255) = SYSTEM_USER;
    DECLARE @ChangedAt DATETIME2(0) = SYSDATETIME();
    
    -- Handle INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @ChangeType = 'INSERT';
        
        INSERT INTO audit.LoanHistory (
            LoanId, ProjectId, BirthOrder, LoanType, Borrower, LoanPhase, LenderId,
            LoanAmount, LoanClosingDate, MaturityDate, FixedOrFloating, IndexName, Spread,
            InterestRate, MiniPermMaturity, MiniPermInterestRate, PermPhaseMaturity,
            PermPhaseInterestRate, ConstructionCompletionDate, LeaseUpCompletedDate,
            IOMaturityDate, PermanentCloseDate, PermanentLoanAmount, Notes,
            ValidFrom, ValidTo, ChangedBy, ChangeType, Application
        )
        SELECT 
            LoanId, ProjectId, BirthOrder, LoanType, Borrower, LoanPhase, LenderId,
            LoanAmount, LoanClosingDate, MaturityDate, FixedOrFloating, IndexName, Spread,
            InterestRate, MiniPermMaturity, MiniPermInterestRate, PermPhaseMaturity,
            PermPhaseInterestRate, ConstructionCompletionDate, LeaseUpCompletedDate,
            IOMaturityDate, PermanentCloseDate, PermanentLoanAmount, Notes,
            @ChangedAt, NULL, @ChangedBy, @ChangeType, 'Domo'
        FROM inserted;
    END
    
    -- Handle UPDATE
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @ChangeType = 'UPDATE';
        
        -- Close previous history
        UPDATE audit.LoanHistory
        SET ValidTo = @ChangedAt
        WHERE LoanId IN (SELECT LoanId FROM inserted)
          AND ValidTo IS NULL;
        
        -- Insert new history
        INSERT INTO audit.LoanHistory (
            LoanId, ProjectId, BirthOrder, LoanType, Borrower, LoanPhase, LenderId,
            LoanAmount, LoanClosingDate, MaturityDate, FixedOrFloating, IndexName, Spread,
            InterestRate, MiniPermMaturity, MiniPermInterestRate, PermPhaseMaturity,
            PermPhaseInterestRate, ConstructionCompletionDate, LeaseUpCompletedDate,
            IOMaturityDate, PermanentCloseDate, PermanentLoanAmount, Notes,
            ValidFrom, ValidTo, ChangedBy, ChangeType, Application
        )
        SELECT 
            LoanId, ProjectId, BirthOrder, LoanType, Borrower, LoanPhase, LenderId,
            LoanAmount, LoanClosingDate, MaturityDate, FixedOrFloating, IndexName, Spread,
            InterestRate, MiniPermMaturity, MiniPermInterestRate, PermPhaseMaturity,
            PermPhaseInterestRate, ConstructionCompletionDate, LeaseUpCompletedDate,
            IOMaturityDate, PermanentCloseDate, PermanentLoanAmount, Notes,
            @ChangedAt, NULL, @ChangedBy, @ChangeType, 'Domo'
        FROM inserted;
        
        -- Log key field changes
        INSERT INTO audit.AuditLog (TableName, RecordId, ColumnName, ChangeType, OldValue, NewValue, ChangedBy, Application)
        SELECT 
            'banking.Loan',
            i.LoanId,
            'LoanAmount',
            @ChangeType,
            CAST(d.LoanAmount AS NVARCHAR(MAX)),
            CAST(i.LoanAmount AS NVARCHAR(MAX)),
            @ChangedBy,
            'Domo'
        FROM inserted i
        INNER JOIN deleted d ON i.LoanId = d.LoanId
        WHERE i.LoanAmount <> d.LoanAmount OR (i.LoanAmount IS NULL AND d.LoanAmount IS NOT NULL) OR (i.LoanAmount IS NOT NULL AND d.LoanAmount IS NULL);
    END
    
    -- Handle DELETE
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @ChangeType = 'DELETE';
        
        UPDATE audit.LoanHistory
        SET ValidTo = @ChangedAt
        WHERE LoanId IN (SELECT LoanId FROM deleted)
          AND ValidTo IS NULL;
    END
END;
GO

-- ============================================================
-- VIEW: Project as of a specific date
-- ============================================================
GO
IF OBJECT_ID('vw_Project_AsOfDate', 'V') IS NOT NULL DROP VIEW vw_Project_AsOfDate;
GO
CREATE VIEW vw_Project_AsOfDate
AS
SELECT 
    p.ProjectId,
    p.ProjectName,
    p.City,
    p.State,
    p.Region,
    p.Location,
    p.Units,
    p.ProductType,
    p.Stage,
    p.EstimatedConstructionStartDate,
    p.CreatedAt,
    p.UpdatedAt
FROM core.Project p;
GO

-- ============================================================
-- FUNCTION: Get Project as of a specific date/time
-- ============================================================
GO
IF OBJECT_ID('dbo.fn_GetProjectAsOfDate', 'IF') IS NOT NULL DROP FUNCTION dbo.fn_GetProjectAsOfDate;
GO
CREATE FUNCTION dbo.fn_GetProjectAsOfDate(
    @ProjectId INT,
    @AsOfDate DATETIME2(0)
)
RETURNS TABLE
AS
RETURN
(
    SELECT TOP 1
        ProjectId,
        ProjectName,
        City,
        State,
        Region,
        Location,
        Units,
        ProductType,
        Stage,
        EstimatedConstructionStartDate,
        ValidFrom,
        ValidTo,
        ChangedBy,
        ChangeType
    FROM audit.ProjectHistory
    WHERE ProjectId = @ProjectId
      AND ValidFrom <= @AsOfDate
      AND (ValidTo IS NULL OR ValidTo > @AsOfDate)
    ORDER BY ValidFrom DESC
);
GO

-- ============================================================
-- FUNCTION: Get all changes for a project
-- ============================================================
GO
IF OBJECT_ID('dbo.fn_GetProjectChangeHistory', 'IF') IS NOT NULL DROP FUNCTION dbo.fn_GetProjectChangeHistory;
GO
CREATE FUNCTION dbo.fn_GetProjectChangeHistory(
    @ProjectId INT
)
RETURNS TABLE
AS
RETURN
(
    SELECT TOP 10000
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
        CASE 
            WHEN ValidTo IS NULL THEN 'Current'
            ELSE 'Historical'
        END AS Status
    FROM audit.ProjectHistory
    WHERE ProjectId = @ProjectId
    ORDER BY ValidFrom DESC
);
GO

-- ============================================================
-- VIEW: Recent changes (for Domo to see what changed)
-- ============================================================
GO
IF OBJECT_ID('vw_RecentChanges', 'V') IS NOT NULL DROP VIEW vw_RecentChanges;
GO
CREATE VIEW vw_RecentChanges AS
SELECT TOP 1000
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
    CASE 
        WHEN al.TableName = 'core.Project' THEN (SELECT ProjectName FROM core.Project WHERE ProjectId = al.RecordId)
        WHEN al.TableName = 'banking.Loan' THEN (SELECT p.ProjectName FROM banking.Loan l JOIN core.Project p ON p.ProjectId = l.ProjectId WHERE l.LoanId = al.RecordId)
        ELSE NULL
    END AS ProjectName
FROM audit.AuditLog al
ORDER BY al.ChangedAt DESC;
GO

PRINT 'Audit tracking system created successfully.';
PRINT 'All changes to Projects and Loans will now be tracked automatically.';
PRINT '';
PRINT 'To view project as of yesterday:';
PRINT '  SELECT * FROM dbo.fn_GetProjectAsOfDate(1, DATEADD(day, -1, GETDATE()));';
PRINT '';
PRINT 'To view all changes for a project:';
PRINT '  SELECT * FROM dbo.fn_GetProjectChangeHistory(1);';
PRINT '';
PRINT 'To view recent changes:';
PRINT '  SELECT * FROM vw_RecentChanges;';

