-- ============================================================
-- SEED DEAL PIPELINE FROM EXISTING PIPELINE DATA
-- Populates DealPipeline records with data from UnderContract, ClosedProperty, etc.
-- Safe to run multiple times (idempotent - only updates NULL fields)
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Seeding DealPipeline from existing pipeline data';
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

    -- Step 1: Update DealPipeline from UnderContract data
    PRINT '📋 Step 1: Updating DealPipeline from UnderContract data...';
    
    DECLARE @UpdatedFromUC INT = 0;
    
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
    
    SET @UpdatedFromUC = @@ROWCOUNT;
    PRINT '   ✓ Updated ' + CAST(@UpdatedFromUC AS NVARCHAR(10)) + ' DealPipeline record(s) from UnderContract';
    PRINT '';
    
    -- Step 2: Update DealPipeline from ClosedProperty data
    PRINT '📋 Step 2: Updating DealPipeline from ClosedProperty data...';
    
    DECLARE @UpdatedFromCP INT = 0;
    
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
    
    SET @UpdatedFromCP = @@ROWCOUNT;
    PRINT '   ✓ Updated ' + CAST(@UpdatedFromCP AS NVARCHAR(10)) + ' DealPipeline record(s) from ClosedProperty';
    PRINT '';
    
    -- Step 3: Recalculate SqFtPrice for records with LandPrice and Acreage
    PRINT '📋 Step 3: Recalculating SqFtPrice...';
    
    DECLARE @RecalculatedSqFt INT = 0;
    
    UPDATE pipeline.DealPipeline
    SET SqFtPrice = LandPrice / (Acreage * 43560),
        UpdatedAt = SYSDATETIME()
    WHERE LandPrice IS NOT NULL
      AND Acreage IS NOT NULL
      AND Acreage > 0
      AND (SqFtPrice IS NULL OR SqFtPrice = 0);
    
    SET @RecalculatedSqFt = @@ROWCOUNT;
    PRINT '   ✓ Recalculated SqFtPrice for ' + CAST(@RecalculatedSqFt AS NVARCHAR(10)) + ' record(s)';
    PRINT '';
    
    -- Step 4: Update UnitCount from CORE.Units if UnitCount is NULL
    PRINT '📋 Step 4: Updating UnitCount from CORE.Units...';
    
    DECLARE @UpdatedUnitCount INT = 0;
    
    UPDATE dp
    SET UnitCount = p.Units,
        UpdatedAt = SYSDATETIME()
    FROM pipeline.DealPipeline dp
    INNER JOIN core.Project p ON dp.ProjectId = p.ProjectId
    WHERE dp.UnitCount IS NULL
      AND p.Units IS NOT NULL;
    
    SET @UpdatedUnitCount = @@ROWCOUNT;
    PRINT '   ✓ Updated UnitCount for ' + CAST(@UpdatedUnitCount AS NVARCHAR(10)) + ' record(s)';
    PRINT '';
    
    -- Summary
    PRINT '============================================================';
    PRINT 'Seeding Summary:';
    PRINT '============================================================';
    PRINT '   - Updated from UnderContract: ' + CAST(@UpdatedFromUC AS NVARCHAR(10));
    PRINT '   - Updated from ClosedProperty: ' + CAST(@UpdatedFromCP AS NVARCHAR(10));
    PRINT '   - Recalculated SqFtPrice: ' + CAST(@RecalculatedSqFt AS NVARCHAR(10));
    PRINT '   - Updated UnitCount: ' + CAST(@UpdatedUnitCount AS NVARCHAR(10));
    PRINT '';
    PRINT '✅ Seeding completed successfully!';
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
PRINT 'Verification - DealPipeline records with data:';
SELECT 
    COUNT(*) AS TotalDealPipelineRecords,
    SUM(CASE WHEN Bank IS NOT NULL THEN 1 ELSE 0 END) AS WithBank,
    SUM(CASE WHEN StartDate IS NOT NULL THEN 1 ELSE 0 END) AS WithStartDate,
    SUM(CASE WHEN Acreage IS NOT NULL THEN 1 ELSE 0 END) AS WithAcreage,
    SUM(CASE WHEN LandPrice IS NOT NULL THEN 1 ELSE 0 END) AS WithLandPrice,
    SUM(CASE WHEN SqFtPrice IS NOT NULL THEN 1 ELSE 0 END) AS WithSqFtPrice,
    SUM(CASE WHEN ClosingDate IS NOT NULL THEN 1 ELSE 0 END) AS WithClosingDate
FROM pipeline.DealPipeline;
GO
