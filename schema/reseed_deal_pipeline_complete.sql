-- ============================================================
-- COMPLETE DEAL PIPELINE RESEED SCRIPT
-- Runs all seeding steps in order:
-- 1. Creates DealPipeline records for Projects without one
-- 2. Populates from existing pipeline data (UnderContract, ClosedProperty)
-- 3. Recalculates SqFtPrice
-- 4. Updates UnitCount from CORE
-- Safe to run multiple times (idempotent)
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'COMPLETE DEAL PIPELINE RESEED';
PRINT '============================================================';
PRINT '';

-- Step 1: Create DealPipeline records for Projects without one
PRINT 'STEP 1: Creating DealPipeline records for Projects without one...';
PRINT '';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DealPipeline' AND schema_id = SCHEMA_ID('pipeline'))
BEGIN
    PRINT '❌ ERROR: pipeline.DealPipeline table does not exist!';
    PRINT '   Please run schema/create_deal_pipeline_table.sql first.';
    PRINT '';
    RETURN;
END

-- Insert DealPipeline records for Projects that don't have one
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
    NULL AS Bank,
    p.EstimatedConstructionStartDate AS StartDate,
    p.Units AS UnitCount,
    NULL AS PreConManagerId,
    NULL AS ConstructionLoanClosingDate,
    NULL AS Notes,
    NULL AS Priority,
    NULL AS Acreage,
    NULL AS LandPrice,
    NULL AS SqFtPrice,
    NULL AS ExecutionDate,
    NULL AS DueDiligenceDate,
    NULL AS ClosingDate,
    NULL AS PurchasingEntity,
    NULL AS Cash,
    NULL AS OpportunityZone,
    NULL AS ClosingNotes,
    NULL AS AsanaTaskGid,
    NULL AS AsanaProjectGid
FROM core.Project p
WHERE NOT EXISTS (
    SELECT 1 
    FROM pipeline.DealPipeline dp 
    WHERE dp.ProjectId = p.ProjectId
);

DECLARE @CreatedCount INT = @@ROWCOUNT;
PRINT '   ✓ Created ' + CAST(@CreatedCount AS NVARCHAR(10)) + ' DealPipeline record(s)';
PRINT '';

-- Step 2: Populate from UnderContract
PRINT 'STEP 2: Populating from UnderContract data...';
PRINT '';

UPDATE dp
SET 
    Acreage = ISNULL(dp.Acreage, uc.Acreage),
    LandPrice = ISNULL(dp.LandPrice, uc.LandPrice),
    SqFtPrice = ISNULL(dp.SqFtPrice, uc.SqFtPrice),
    ExecutionDate = ISNULL(dp.ExecutionDate, uc.ExecutionDate),
    DueDiligenceDate = ISNULL(dp.DueDiligenceDate, uc.DueDiligenceDate),
    ClosingDate = ISNULL(dp.ClosingDate, uc.ClosingDate),
    PurchasingEntity = ISNULL(dp.PurchasingEntity, uc.PurchasingEntity),
    Cash = ISNULL(dp.Cash, uc.Cash),
    OpportunityZone = ISNULL(dp.OpportunityZone, uc.OpportunityZone),
    ClosingNotes = ISNULL(dp.ClosingNotes, uc.ClosingNotes),
    UpdatedAt = SYSDATETIME()
FROM pipeline.DealPipeline dp
INNER JOIN pipeline.UnderContract uc ON dp.ProjectId = uc.ProjectId
WHERE dp.Acreage IS NULL 
   OR dp.LandPrice IS NULL 
   OR dp.ExecutionDate IS NULL
   OR dp.DueDiligenceDate IS NULL
   OR dp.ClosingDate IS NULL;

DECLARE @UpdatedFromUC INT = @@ROWCOUNT;
PRINT '   ✓ Updated ' + CAST(@UpdatedFromUC AS NVARCHAR(10)) + ' record(s) from UnderContract';
PRINT '';

-- Step 3: Populate from ClosedProperty
PRINT 'STEP 3: Populating from ClosedProperty data...';
PRINT '';

UPDATE dp
SET 
    Acreage = ISNULL(dp.Acreage, cp.Acreage),
    LandPrice = ISNULL(dp.LandPrice, cp.Price),
    SqFtPrice = ISNULL(dp.SqFtPrice, cp.PricePerSF),
    UnitCount = ISNULL(dp.UnitCount, cp.Units),
    DueDiligenceDate = ISNULL(dp.DueDiligenceDate, cp.DueDiligenceDate),
    ClosingDate = ISNULL(dp.ClosingDate, cp.LandClosingDate),
    PurchasingEntity = ISNULL(dp.PurchasingEntity, cp.PurchasingEntity),
    Cash = ISNULL(dp.Cash, cp.CashFlag),
    UpdatedAt = SYSDATETIME()
FROM pipeline.DealPipeline dp
INNER JOIN pipeline.ClosedProperty cp ON dp.ProjectId = cp.ProjectId
WHERE dp.Acreage IS NULL 
   OR dp.LandPrice IS NULL 
   OR dp.ClosingDate IS NULL;

DECLARE @UpdatedFromCP INT = @@ROWCOUNT;
PRINT '   ✓ Updated ' + CAST(@UpdatedFromCP AS NVARCHAR(10)) + ' record(s) from ClosedProperty';
PRINT '';

-- Step 4: Recalculate SqFtPrice
PRINT 'STEP 4: Recalculating SqFtPrice...';
PRINT '';

UPDATE pipeline.DealPipeline
SET SqFtPrice = LandPrice / (Acreage * 43560),
    UpdatedAt = SYSDATETIME()
WHERE LandPrice IS NOT NULL
  AND Acreage IS NOT NULL
  AND Acreage > 0
  AND (SqFtPrice IS NULL OR SqFtPrice = 0);

DECLARE @RecalculatedSqFt INT = @@ROWCOUNT;
PRINT '   ✓ Recalculated SqFtPrice for ' + CAST(@RecalculatedSqFt AS NVARCHAR(10)) + ' record(s)';
PRINT '';

-- Step 5: Update UnitCount from CORE.Units
PRINT 'STEP 5: Updating UnitCount from CORE.Units...';
PRINT '';

UPDATE dp
SET UnitCount = p.Units,
    UpdatedAt = SYSDATETIME()
FROM pipeline.DealPipeline dp
INNER JOIN core.Project p ON dp.ProjectId = p.ProjectId
WHERE dp.UnitCount IS NULL
  AND p.Units IS NOT NULL;

DECLARE @UpdatedUnitCount INT = @@ROWCOUNT;
PRINT '   ✓ Updated UnitCount for ' + CAST(@UpdatedUnitCount AS NVARCHAR(10)) + ' record(s)';
PRINT '';

-- Final Summary
PRINT '============================================================';
PRINT 'RESEED SUMMARY';
PRINT '============================================================';
PRINT '   - Created DealPipeline records: ' + CAST(@CreatedCount AS NVARCHAR(10));
PRINT '   - Updated from UnderContract: ' + CAST(@UpdatedFromUC AS NVARCHAR(10));
PRINT '   - Updated from ClosedProperty: ' + CAST(@UpdatedFromCP AS NVARCHAR(10));
PRINT '   - Recalculated SqFtPrice: ' + CAST(@RecalculatedSqFt AS NVARCHAR(10));
PRINT '   - Updated UnitCount: ' + CAST(@UpdatedUnitCount AS NVARCHAR(10));
PRINT '';
PRINT '✅ Complete reseed finished successfully!';
PRINT '============================================================';
PRINT '';
GO

-- Final verification
PRINT 'Final Verification:';
SELECT 
    COUNT(*) AS TotalDealPipelineRecords,
    COUNT(DISTINCT ProjectId) AS UniqueProjects,
    SUM(CASE WHEN Bank IS NOT NULL THEN 1 ELSE 0 END) AS WithBank,
    SUM(CASE WHEN StartDate IS NOT NULL THEN 1 ELSE 0 END) AS WithStartDate,
    SUM(CASE WHEN Acreage IS NOT NULL THEN 1 ELSE 0 END) AS WithAcreage,
    SUM(CASE WHEN LandPrice IS NOT NULL THEN 1 ELSE 0 END) AS WithLandPrice,
    SUM(CASE WHEN SqFtPrice IS NOT NULL THEN 1 ELSE 0 END) AS WithSqFtPrice,
    SUM(CASE WHEN ClosingDate IS NOT NULL THEN 1 ELSE 0 END) AS WithClosingDate
FROM pipeline.DealPipeline;
GO

PRINT '';
PRINT 'Sample DealPipeline records:';
SELECT TOP 10
    dp.DealPipelineId,
    p.ProjectName,
    p.Stage,
    dp.Bank,
    dp.StartDate,
    dp.Acreage,
    dp.LandPrice,
    dp.SqFtPrice,
    dp.ClosingDate
FROM pipeline.DealPipeline dp
INNER JOIN core.Project p ON dp.ProjectId = p.ProjectId
ORDER BY dp.DealPipelineId;
GO
