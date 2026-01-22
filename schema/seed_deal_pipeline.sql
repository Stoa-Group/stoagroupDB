-- ============================================================
-- SEED DEAL PIPELINE FOR EXISTING PROJECTS
-- Creates DealPipeline records for Projects that don't have one yet
-- Safe to run multiple times (idempotent)
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Seeding DealPipeline for existing Projects';
PRINT '============================================================';
PRINT '';

BEGIN TRY
    -- Check if DealPipeline table exists
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DealPipeline' AND schema_id = SCHEMA_ID('pipeline'))
    BEGIN
        PRINT '❌ ERROR: pipeline.DealPipeline table does not exist!';
        PRINT '   Please run schema/create_deal_pipeline_table.sql first.';
        PRINT '';
        RETURN;
    END

    -- Check current state
    PRINT '📊 Current State:';
    DECLARE @TotalProjects INT;
    DECLARE @ProjectsWithDealPipeline INT;
    DECLARE @ProjectsWithoutDealPipeline INT;
    DECLARE @ProjectsToSeed INT;
    
    SELECT 
        @TotalProjects = COUNT(*),
        @ProjectsWithDealPipeline = (
            SELECT COUNT(DISTINCT ProjectId) 
            FROM pipeline.DealPipeline
        ),
        @ProjectsWithoutDealPipeline = (
            SELECT COUNT(*)
            FROM core.Project p
            WHERE NOT EXISTS (
                SELECT 1 FROM pipeline.DealPipeline dp WHERE dp.ProjectId = p.ProjectId
            )
        )
    FROM core.Project;
    
    SET @ProjectsToSeed = @ProjectsWithoutDealPipeline;
    
    PRINT '   - Total Projects: ' + CAST(@TotalProjects AS NVARCHAR(10));
    PRINT '   - Projects with DealPipeline: ' + CAST(@ProjectsWithDealPipeline AS NVARCHAR(10));
    PRINT '   - Projects without DealPipeline: ' + CAST(@ProjectsWithoutDealPipeline AS NVARCHAR(10));
    PRINT '';
    
    IF @ProjectsToSeed = 0
    BEGIN
        PRINT '✅ All projects already have DealPipeline records!';
        PRINT '';
        PRINT '============================================================';
        PRINT 'No seeding needed.';
        PRINT '============================================================';
        RETURN;
    END
    
    -- Seed DealPipeline records for Projects that don't have one
    PRINT '🔄 Creating DealPipeline records for ' + CAST(@ProjectsToSeed AS NVARCHAR(10)) + ' project(s)...';
    PRINT '';
    
    INSERT INTO pipeline.DealPipeline (
        ProjectId,
        Bank,
        StartDate,
        UnitCount,
        PreConManagerId,
        ConstructionLoanClosingDate,
        Notes,
        Priority,
        Acreage,
        LandPrice,
        SqFtPrice,
        ExecutionDate,
        DueDiligenceDate,
        ClosingDate,
        PurchasingEntity,
        Cash,
        OpportunityZone,
        ClosingNotes,
        AsanaTaskGid,
        AsanaProjectGid
    )
    SELECT 
        p.ProjectId,
        NULL AS Bank,  -- Will be populated later
        p.EstimatedConstructionStartDate AS StartDate,  -- Use CORE date if available
        p.Units AS UnitCount,  -- Use CORE Units
        NULL AS PreConManagerId,  -- Will be populated later
        NULL AS ConstructionLoanClosingDate,
        NULL AS Notes,
        NULL AS Priority,  -- Default to NULL
        NULL AS Acreage,  -- Will be populated later
        NULL AS LandPrice,
        NULL AS SqFtPrice,  -- Will be calculated when LandPrice and Acreage are set
        NULL AS ExecutionDate,
        NULL AS DueDiligenceDate,
        NULL AS ClosingDate,
        NULL AS PurchasingEntity,
        NULL AS Cash,
        NULL AS OpportunityZone,
        NULL AS ClosingNotes,
        NULL AS AsanaTaskGid,  -- Will be populated by import script
        NULL AS AsanaProjectGid
    FROM core.Project p
    WHERE NOT EXISTS (
        SELECT 1 
        FROM pipeline.DealPipeline dp 
        WHERE dp.ProjectId = p.ProjectId
    );
    
    DECLARE @InsertedCount INT = @@ROWCOUNT;
    
    PRINT '✅ Created ' + CAST(@InsertedCount AS NVARCHAR(10)) + ' DealPipeline record(s)';
    PRINT '';
    
    -- Summary
    PRINT '============================================================';
    PRINT 'Seeding Summary:';
    PRINT '============================================================';
    PRINT '   - Projects seeded: ' + CAST(@InsertedCount AS NVARCHAR(10));
    PRINT '   - Projects already had DealPipeline: ' + CAST(@ProjectsWithDealPipeline AS NVARCHAR(10));
    PRINT '';
    PRINT '✅ Seeding completed successfully!';
    PRINT '';
    PRINT 'Next steps:';
    PRINT '   1. Run import script to populate from Asana:';
    PRINT '      npm run db:import-asana-deal-pipeline';
    PRINT '   2. Or manually update DealPipeline records via API';
    PRINT '============================================================';
    
END TRY
BEGIN CATCH
    PRINT '❌ ERROR during seeding:';
    PRINT '   ' + ERROR_MESSAGE();
    PRINT '';
    PRINT '   Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
    PRINT '   Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
    THROW;
END CATCH
GO

-- Verification query
PRINT '';
PRINT 'Verification:';
SELECT 
    COUNT(*) AS TotalProjects,
    COUNT(dp.DealPipelineId) AS ProjectsWithDealPipeline,
    COUNT(*) - COUNT(dp.DealPipelineId) AS ProjectsWithoutDealPipeline
FROM core.Project p
LEFT JOIN pipeline.DealPipeline dp ON p.ProjectId = dp.ProjectId;
GO
