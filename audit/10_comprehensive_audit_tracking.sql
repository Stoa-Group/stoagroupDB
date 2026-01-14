-- ============================================================
-- COMPREHENSIVE AUDIT TRACKING SYSTEM
-- Tracks ALL changes to ALL tables automatically
-- Allows you to see what ANY data looked like at ANY point in time
-- ============================================================
-- 
-- This system will track:
-- - All CORE tables (Project, Bank, Person, EquityPartner, ProductType, Region)
-- - All BANKING tables (Loan, DSCRTest, Participation, Guarantee, Covenant, LiquidityRequirement, BankTarget, EquityCommitment)
-- - All PIPELINE tables (UnderContract, CommercialListed, CommercialAcreage, ClosedProperty)
--
-- You can query historical data like:
--   "What were the bank details for Project X 1 month ago?"
--   "What participations existed for this project last quarter?"
--   "Who changed the loan amount and when?"
-- ============================================================

SET NOCOUNT ON;

PRINT '============================================================';
PRINT 'Creating Comprehensive Audit Tracking System';
PRINT 'This will track ALL changes to ALL tables';
PRINT '============================================================';
PRINT '';

-- Create audit schema
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'audit') 
    EXEC('CREATE SCHEMA audit');
GO

-- ============================================================
-- UNIVERSAL AUDIT LOG TABLE
-- Tracks all changes to all tables
-- ============================================================
IF OBJECT_ID('audit.AuditLog', 'U') IS NOT NULL DROP TABLE audit.AuditLog;
CREATE TABLE audit.AuditLog (
    AuditLogId     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLog PRIMARY KEY,
    
    -- What changed
    TableName      NVARCHAR(128) NOT NULL,
    SchemaName     NVARCHAR(128) NOT NULL,
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
    Notes          NVARCHAR(MAX) NULL,
    
    -- For project-related records, store ProjectId for easy filtering
    ProjectId      INT NULL
);

-- Indexes for fast queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_Table_Record')
    CREATE INDEX IX_AuditLog_Table_Record ON audit.AuditLog(SchemaName, TableName, RecordId, ChangedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_ChangedAt')
    CREATE INDEX IX_AuditLog_ChangedAt ON audit.AuditLog(ChangedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_ChangedBy')
    CREATE INDEX IX_AuditLog_ChangedBy ON audit.AuditLog(ChangedBy);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_Project')
    CREATE INDEX IX_AuditLog_Project ON audit.AuditLog(ProjectId, ChangedAt DESC);
GO

-- ============================================================
-- UNIVERSAL HISTORY TABLE
-- Stores JSON snapshots of all records for point-in-time queries
-- ============================================================
IF OBJECT_ID('audit.RecordHistory', 'U') IS NOT NULL DROP TABLE audit.RecordHistory;
CREATE TABLE audit.RecordHistory (
    HistoryId      BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RecordHistory PRIMARY KEY,
    
    -- What record
    SchemaName     NVARCHAR(128) NOT NULL,
    TableName      NVARCHAR(128) NOT NULL,
    RecordId       INT NOT NULL,
    
    -- Complete record snapshot as JSON
    RecordData     NVARCHAR(MAX) NOT NULL,  -- JSON representation of the entire record
    
    -- Audit info
    ValidFrom      DATETIME2(0) NOT NULL,
    ValidTo        DATETIME2(0) NULL,  -- NULL means current version
    ChangedBy      NVARCHAR(255) NULL,
    ChangeType     NVARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    Application    NVARCHAR(100) NULL,
    
    -- For project-related records
    ProjectId      INT NULL
);

-- Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RecordHistory_Table_Record')
    CREATE INDEX IX_RecordHistory_Table_Record ON audit.RecordHistory(SchemaName, TableName, RecordId, ValidFrom DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RecordHistory_ValidFrom')
    CREATE INDEX IX_RecordHistory_ValidFrom ON audit.RecordHistory(ValidFrom DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RecordHistory_Project')
    CREATE INDEX IX_RecordHistory_Project ON audit.RecordHistory(ProjectId, ValidFrom DESC);
GO

-- ============================================================
-- HELPER FUNCTION: Get ProjectId from any table
-- ============================================================
IF OBJECT_ID('audit.fn_GetProjectId', 'FN') IS NOT NULL DROP FUNCTION audit.fn_GetProjectId;
GO
CREATE FUNCTION audit.fn_GetProjectId(
    @SchemaName NVARCHAR(128),
    @TableName NVARCHAR(128),
    @RecordId INT
)
RETURNS INT
AS
BEGIN
    DECLARE @ProjectId INT = NULL;
    DECLARE @Sql NVARCHAR(MAX);
    
    -- Most tables have ProjectId directly
    IF @TableName IN ('Project', 'Loan', 'DSCRTest', 'Participation', 'Guarantee', 'Covenant', 
                      'LiquidityRequirement', 'EquityCommitment', 'UnderContract', 
                      'CommercialListed', 'CommercialAcreage', 'ClosedProperty')
    BEGIN
        SET @Sql = N'SELECT @ProjectId = ProjectId FROM ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName) + 
                   N' WHERE ' + 
                   CASE @TableName
                       WHEN 'Project' THEN 'ProjectId'
                       WHEN 'Loan' THEN 'LoanId'
                       WHEN 'DSCRTest' THEN 'DSCRTestId'
                       WHEN 'Participation' THEN 'ParticipationId'
                       WHEN 'Guarantee' THEN 'GuaranteeId'
                       WHEN 'Covenant' THEN 'CovenantId'
                       WHEN 'LiquidityRequirement' THEN 'LiquidityRequirementId'
                       WHEN 'EquityCommitment' THEN 'EquityCommitmentId'
                       WHEN 'UnderContract' THEN 'UnderContractId'
                       WHEN 'CommercialListed' THEN 'CommercialListedId'
                       WHEN 'CommercialAcreage' THEN 'CommercialAcreageId'
                       WHEN 'ClosedProperty' THEN 'ClosedPropertyId'
                   END + N' = @RecordId';
        
        EXEC sp_executesql @Sql, N'@RecordId INT, @ProjectId INT OUTPUT', @RecordId, @ProjectId OUTPUT;
    END
    
    RETURN @ProjectId;
END;
GO

-- ============================================================
-- GENERIC TRIGGER TEMPLATE FUNCTION
-- Creates audit triggers for any table
-- ============================================================
IF OBJECT_ID('audit.sp_CreateAuditTrigger', 'P') IS NOT NULL DROP PROCEDURE audit.sp_CreateAuditTrigger;
GO
CREATE PROCEDURE audit.sp_CreateAuditTrigger
    @SchemaName NVARCHAR(128),
    @TableName NVARCHAR(128),
    @PrimaryKeyColumn NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TriggerName NVARCHAR(255) = 'trg_' + @TableName + '_Audit';
    DECLARE @FullTableName NVARCHAR(255) = QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName);
    DECLARE @Sql NVARCHAR(MAX);
    
    -- Drop existing trigger if it exists
    IF OBJECT_ID(QUOTENAME(@SchemaName) + '.' + @TriggerName, 'TR') IS NOT NULL
    BEGIN
        SET @Sql = N'DROP TRIGGER ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TriggerName);
        EXEC sp_executesql @Sql;
    END
    
    -- Build trigger SQL
    SET @Sql = N'
CREATE TRIGGER ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TriggerName) + N'
ON ' + @FullTableName + N'
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ChangeType NVARCHAR(10);
    DECLARE @ChangedBy NVARCHAR(255) = COALESCE(SYSTEM_USER, SUSER_SNAME(), ''System'');
    DECLARE @ChangedAt DATETIME2(0) = SYSDATETIME();
    DECLARE @Application NVARCHAR(100) = ''API'';
    
    -- Handle INSERT
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @ChangeType = ''INSERT'';
        
        -- Log to audit log
        INSERT INTO audit.AuditLog (SchemaName, TableName, RecordId, ColumnName, ChangeType, NewValue, ChangedBy, Application, ProjectId)
        SELECT 
            ''' + @SchemaName + ''',
            ''' + @TableName + ''',
            i.' + QUOTENAME(@PrimaryKeyColumn) + N',
            NULL,
            @ChangeType,
            ''Record inserted'',
            @ChangedBy,
            @Application,
            CASE WHEN ''' + @TableName + ''' = ''Project'' THEN i.' + QUOTENAME(@PrimaryKeyColumn) + N'
                 WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(''' + @FullTableName + ''') AND name = ''ProjectId'')
                 THEN (SELECT ProjectId FROM inserted WHERE ' + QUOTENAME(@PrimaryKeyColumn) + N' = i.' + QUOTENAME(@PrimaryKeyColumn) + N')
                 ELSE NULL
            END
        FROM inserted i;
        
        -- Store complete record snapshot as JSON
        INSERT INTO audit.RecordHistory (SchemaName, TableName, RecordId, RecordData, ValidFrom, ValidTo, ChangedBy, ChangeType, Application, ProjectId)
        SELECT 
            ''' + @SchemaName + ''',
            ''' + @TableName + ''',
            i.' + QUOTENAME(@PrimaryKeyColumn) + N',
            (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            @ChangedAt,
            NULL,
            @ChangedBy,
            @ChangeType,
            @Application,
            CASE WHEN ''' + @TableName + ''' = ''Project'' THEN i.' + QUOTENAME(@PrimaryKeyColumn) + N'
                 WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(''' + @FullTableName + ''') AND name = ''ProjectId'')
                 THEN (SELECT ProjectId FROM inserted WHERE ' + QUOTENAME(@PrimaryKeyColumn) + N' = i.' + QUOTENAME(@PrimaryKeyColumn) + N')
                 ELSE NULL
            END
        FROM inserted i;
    END
    
    -- Handle UPDATE
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        SET @ChangeType = ''UPDATE'';
        
        -- Close previous history records
        UPDATE audit.RecordHistory
        SET ValidTo = @ChangedAt
        WHERE SchemaName = ''' + @SchemaName + '''
          AND TableName = ''' + @TableName + '''
          AND RecordId IN (SELECT ' + QUOTENAME(@PrimaryKeyColumn) + N' FROM inserted)
          AND ValidTo IS NULL;
        
        -- Log individual column changes
        DECLARE @Columns TABLE (ColumnName NVARCHAR(128));
        INSERT INTO @Columns
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ''' + @SchemaName + '''
          AND TABLE_NAME = ''' + @TableName + '''
          AND COLUMN_NAME NOT IN (''' + @PrimaryKeyColumn + ''', ''CreatedAt'', ''UpdatedAt'');
        
        DECLARE @ColName NVARCHAR(128);
        DECLARE col_cursor CURSOR FOR SELECT ColumnName FROM @Columns;
        OPEN col_cursor;
        FETCH NEXT FROM col_cursor INTO @ColName;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @Sql = N''
                INSERT INTO audit.AuditLog (SchemaName, TableName, RecordId, ColumnName, ChangeType, OldValue, NewValue, ChangedBy, Application, ProjectId)
                SELECT 
                    ''''' + @SchemaName + ''''',
                    ''''' + @TableName + ''''',
                    i.'' + QUOTENAME(@PrimaryKeyColumn, '''') + '',
                    ''''' + @ColName + ''''',
                    @ChangeType,
                    CAST(d.'' + QUOTENAME(@ColName, '''') + ' AS NVARCHAR(MAX)),
                    CAST(i.'' + QUOTENAME(@ColName, '''') + ' AS NVARCHAR(MAX)),
                    @ChangedBy,
                    @Application,
                    CASE WHEN ''''' + @TableName + '''' = ''''Project'''' THEN i.'' + QUOTENAME(@PrimaryKeyColumn, '''') + '
                         WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(''''' + @FullTableName + ''''') AND name = ''''ProjectId'''')
                         THEN (SELECT TOP 1 ProjectId FROM inserted)
                         ELSE NULL
                    END
                FROM inserted i
                INNER JOIN deleted d ON i.'' + QUOTENAME(@PrimaryKeyColumn, '''') + ' = d.'' + QUOTENAME(@PrimaryKeyColumn, '''') + '
                WHERE (i.'' + QUOTENAME(@ColName, '''') + ' <> d.'' + QUOTENAME(@ColName, '''') + '
                    OR (i.'' + QUOTENAME(@ColName, '''') + ' IS NULL AND d.'' + QUOTENAME(@ColName, '''') + ' IS NOT NULL)
                    OR (i.'' + QUOTENAME(@ColName, '''') + ' IS NOT NULL AND d.'' + QUOTENAME(@ColName, '''') + ' IS NULL));
            '';
            EXEC sp_executesql @Sql, N''@ChangeType NVARCHAR(10), @ChangedBy NVARCHAR(255), @Application NVARCHAR(100)'', @ChangeType, @ChangedBy, @Application;
            
            FETCH NEXT FROM col_cursor INTO @ColName;
        END
        
        CLOSE col_cursor;
        DEALLOCATE col_cursor;
        
        -- Store new complete record snapshot
        INSERT INTO audit.RecordHistory (SchemaName, TableName, RecordId, RecordData, ValidFrom, ValidTo, ChangedBy, ChangeType, Application, ProjectId)
        SELECT 
            ''' + @SchemaName + ''',
            ''' + @TableName + ''',
            i.' + QUOTENAME(@PrimaryKeyColumn) + N',
            (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            @ChangedAt,
            NULL,
            @ChangedBy,
            @ChangeType,
            @Application,
            CASE WHEN ''' + @TableName + ''' = ''Project'' THEN i.' + QUOTENAME(@PrimaryKeyColumn) + N'
                 WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(''' + @FullTableName + ''') AND name = ''ProjectId'')
                 THEN (SELECT ProjectId FROM inserted WHERE ' + QUOTENAME(@PrimaryKeyColumn) + N' = i.' + QUOTENAME(@PrimaryKeyColumn) + N')
                 ELSE NULL
            END
        FROM inserted i;
    END
    
    -- Handle DELETE
    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        SET @ChangeType = ''DELETE'';
        
        -- Close history records
        UPDATE audit.RecordHistory
        SET ValidTo = @ChangedAt
        WHERE SchemaName = ''' + @SchemaName + '''
          AND TableName = ''' + @TableName + '''
          AND RecordId IN (SELECT ' + QUOTENAME(@PrimaryKeyColumn) + N' FROM deleted)
          AND ValidTo IS NULL;
        
        -- Log deletion
        INSERT INTO audit.AuditLog (SchemaName, TableName, RecordId, ColumnName, ChangeType, OldValue, ChangedBy, Application, ProjectId)
        SELECT 
            ''' + @SchemaName + ''',
            ''' + @TableName + ''',
            d.' + QUOTENAME(@PrimaryKeyColumn) + N',
            NULL,
            @ChangeType,
            ''Record deleted'',
            @ChangedBy,
            @Application,
            CASE WHEN ''' + @TableName + ''' = ''Project'' THEN d.' + QUOTENAME(@PrimaryKeyColumn) + N'
                 WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(''' + @FullTableName + ''') AND name = ''ProjectId'')
                 THEN (SELECT ProjectId FROM deleted WHERE ' + QUOTENAME(@PrimaryKeyColumn) + N' = d.' + QUOTENAME(@PrimaryKeyColumn) + N')
                 ELSE NULL
            END
        FROM deleted d;
    END
END';
    
    EXEC sp_executesql @Sql;
    
    PRINT '   ✓ Created audit trigger for ' + @SchemaName + '.' + @TableName;
END;
GO

-- ============================================================
-- CREATE AUDIT TRIGGERS FOR ALL TABLES
-- ============================================================
PRINT '';
PRINT 'Creating audit triggers for all tables...';
PRINT '';

-- CORE SCHEMA
EXEC audit.sp_CreateAuditTrigger 'core', 'Project', 'ProjectId';
EXEC audit.sp_CreateAuditTrigger 'core', 'Bank', 'BankId';
EXEC audit.sp_CreateAuditTrigger 'core', 'Person', 'PersonId';
EXEC audit.sp_CreateAuditTrigger 'core', 'EquityPartner', 'EquityPartnerId';
EXEC audit.sp_CreateAuditTrigger 'core', 'ProductType', 'ProductTypeId';
EXEC audit.sp_CreateAuditTrigger 'core', 'Region', 'RegionId';

-- BANKING SCHEMA
EXEC audit.sp_CreateAuditTrigger 'banking', 'Loan', 'LoanId';
EXEC audit.sp_CreateAuditTrigger 'banking', 'DSCRTest', 'DSCRTestId';
EXEC audit.sp_CreateAuditTrigger 'banking', 'Participation', 'ParticipationId';
EXEC audit.sp_CreateAuditTrigger 'banking', 'Guarantee', 'GuaranteeId';
EXEC audit.sp_CreateAuditTrigger 'banking', 'Covenant', 'CovenantId';
EXEC audit.sp_CreateAuditTrigger 'banking', 'LiquidityRequirement', 'LiquidityRequirementId';
EXEC audit.sp_CreateAuditTrigger 'banking', 'BankTarget', 'BankTargetId';
EXEC audit.sp_CreateAuditTrigger 'banking', 'EquityCommitment', 'EquityCommitmentId';

-- PIPELINE SCHEMA
EXEC audit.sp_CreateAuditTrigger 'pipeline', 'UnderContract', 'UnderContractId';
EXEC audit.sp_CreateAuditTrigger 'pipeline', 'CommercialListed', 'CommercialListedId';
EXEC audit.sp_CreateAuditTrigger 'pipeline', 'CommercialAcreage', 'CommercialAcreageId';
EXEC audit.sp_CreateAuditTrigger 'pipeline', 'ClosedProperty', 'ClosedPropertyId';

GO

-- ============================================================
-- HELPER VIEWS AND FUNCTIONS FOR QUERYING HISTORY
-- ============================================================

-- View: Recent changes across all tables
IF OBJECT_ID('audit.vw_RecentChanges', 'V') IS NOT NULL DROP VIEW audit.vw_RecentChanges;
GO
CREATE VIEW audit.vw_RecentChanges AS
SELECT TOP 1000
    al.AuditLogId,
    al.SchemaName,
    al.TableName,
    al.RecordId,
    al.ColumnName,
    al.ChangeType,
    al.OldValue,
    al.NewValue,
    al.ChangedBy,
    al.ChangedAt,
    al.Application,
    al.ProjectId,
    CASE 
        WHEN al.TableName = 'Project' THEN (SELECT ProjectName FROM core.Project WHERE ProjectId = al.RecordId)
        WHEN al.TableName = 'Loan' THEN (SELECT p.ProjectName FROM banking.Loan l JOIN core.Project p ON p.ProjectId = l.ProjectId WHERE l.LoanId = al.RecordId)
        WHEN al.TableName = 'Participation' THEN (SELECT p.ProjectName FROM banking.Participation part JOIN core.Project p ON p.ProjectId = part.ProjectId WHERE part.ParticipationId = al.RecordId)
        WHEN al.TableName = 'Bank' THEN (SELECT BankName FROM core.Bank WHERE BankId = al.RecordId)
        ELSE NULL
    END AS RecordName
FROM audit.AuditLog al
ORDER BY al.ChangedAt DESC;
GO

-- Function: Get record as of a specific date
IF OBJECT_ID('audit.fn_GetRecordAsOfDate', 'IF') IS NOT NULL DROP FUNCTION audit.fn_GetRecordAsOfDate;
GO
CREATE FUNCTION audit.fn_GetRecordAsOfDate(
    @SchemaName NVARCHAR(128),
    @TableName NVARCHAR(128),
    @RecordId INT,
    @AsOfDate DATETIME2(0)
)
RETURNS TABLE
AS
RETURN
(
    SELECT TOP 1
        HistoryId,
        SchemaName,
        TableName,
        RecordId,
        RecordData,
        ValidFrom,
        ValidTo,
        ChangedBy,
        ChangeType,
        Application,
        ProjectId
    FROM audit.RecordHistory
    WHERE SchemaName = @SchemaName
      AND TableName = @TableName
      AND RecordId = @RecordId
      AND ValidFrom <= @AsOfDate
      AND (ValidTo IS NULL OR ValidTo > @AsOfDate)
    ORDER BY ValidFrom DESC
);
GO

-- Function: Get all changes for a record
IF OBJECT_ID('audit.fn_GetRecordChangeHistory', 'IF') IS NOT NULL DROP FUNCTION audit.fn_GetRecordChangeHistory;
GO
CREATE FUNCTION audit.fn_GetRecordChangeHistory(
    @SchemaName NVARCHAR(128),
    @TableName NVARCHAR(128),
    @RecordId INT
)
RETURNS TABLE
AS
RETURN
(
    SELECT TOP 10000
        HistoryId,
        SchemaName,
        TableName,
        RecordId,
        RecordData,
        ValidFrom,
        ValidTo,
        ChangedBy,
        ChangeType,
        Application,
        ProjectId,
        CASE 
            WHEN ValidTo IS NULL THEN 'Current'
            ELSE 'Historical'
        END AS Status
    FROM audit.RecordHistory
    WHERE SchemaName = @SchemaName
      AND TableName = @TableName
      AND RecordId = @RecordId
    ORDER BY ValidFrom DESC
);
GO

-- Function: Get all changes for a project (across all related tables)
IF OBJECT_ID('audit.fn_GetProjectChangeHistory', 'IF') IS NOT NULL DROP FUNCTION audit.fn_GetProjectChangeHistory;
GO
CREATE FUNCTION audit.fn_GetProjectChangeHistory(
    @ProjectId INT,
    @StartDate DATETIME2(0) = NULL,
    @EndDate DATETIME2(0) = NULL
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        al.AuditLogId,
        al.SchemaName,
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
            WHEN al.TableName = 'Loan' THEN (SELECT LoanPhase FROM banking.Loan WHERE LoanId = al.RecordId)
            WHEN al.TableName = 'Participation' THEN (SELECT b.BankName FROM banking.Participation p JOIN core.Bank b ON b.BankId = p.BankId WHERE p.ParticipationId = al.RecordId)
            WHEN al.TableName = 'Bank' THEN (SELECT BankName FROM core.Bank WHERE BankId = al.RecordId)
            ELSE NULL
        END AS RecordDescription
    FROM audit.AuditLog al
    WHERE al.ProjectId = @ProjectId
      AND (@StartDate IS NULL OR al.ChangedAt >= @StartDate)
      AND (@EndDate IS NULL OR al.ChangedAt <= @EndDate)
);
GO

PRINT '';
PRINT '============================================================';
PRINT 'Comprehensive Audit Tracking System Created Successfully!';
PRINT '============================================================';
PRINT '';
PRINT 'All tables are now being tracked automatically:';
PRINT '  ✓ CORE: Project, Bank, Person, EquityPartner, ProductType, Region';
PRINT '  ✓ BANKING: Loan, DSCRTest, Participation, Guarantee, Covenant,';
PRINT '            LiquidityRequirement, BankTarget, EquityCommitment';
PRINT '  ✓ PIPELINE: UnderContract, CommercialListed, CommercialAcreage, ClosedProperty';
PRINT '';
PRINT 'Example Queries:';
PRINT '';
PRINT '1. See all changes for a project in the last month:';
PRINT '   SELECT * FROM audit.fn_GetProjectChangeHistory(1, DATEADD(month, -1, GETDATE()), GETDATE());';
PRINT '';
PRINT '2. See what a loan looked like 1 month ago:';
PRINT '   SELECT * FROM audit.fn_GetRecordAsOfDate(''banking'', ''Loan'', 1, DATEADD(month, -1, GETDATE()));';
PRINT '';
PRINT '3. See all changes to participations for a project:';
PRINT '   SELECT * FROM audit.AuditLog WHERE ProjectId = 1 AND TableName = ''Participation'' ORDER BY ChangedAt DESC;';
PRINT '';
PRINT '4. See recent changes across all tables:';
PRINT '   SELECT * FROM audit.vw_RecentChanges WHERE ChangedAt >= DATEADD(day, -7, GETDATE());';
PRINT '';
PRINT '5. See what bank details existed for a project 1 month ago:';
PRINT '   SELECT * FROM audit.AuditLog';
PRINT '   WHERE ProjectId = 1';
PRINT '     AND TableName IN (''Loan'', ''Participation'', ''BankTarget'')';
PRINT '     AND ChangedAt <= DATEADD(month, -1, GETDATE())';
PRINT '   ORDER BY ChangedAt DESC;';
PRINT '';
