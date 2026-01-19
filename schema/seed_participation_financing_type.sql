-- ============================================================
-- SEED FinancingType FOR ALL PARTICIPATIONS
-- Sets FinancingType to 'Construction' for all existing participations
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Seeding FinancingType for all participations';
PRINT '============================================================';
PRINT '';

BEGIN TRY
    -- Check current state
    PRINT '📊 Current State:';
    DECLARE @TotalCount INT;
    DECLARE @NullCount INT;
    DECLARE @ConstructionCount INT;
    DECLARE @PermanentCount INT;
    
    SELECT 
        @TotalCount = COUNT(*),
        @NullCount = SUM(CASE WHEN FinancingType IS NULL THEN 1 ELSE 0 END),
        @ConstructionCount = SUM(CASE WHEN FinancingType = 'Construction' THEN 1 ELSE 0 END),
        @PermanentCount = SUM(CASE WHEN FinancingType = 'Permanent' THEN 1 ELSE 0 END)
    FROM banking.Participation;
    
    PRINT '   - Total Participations: ' + CAST(@TotalCount AS NVARCHAR(10));
    PRINT '   - NULL FinancingType: ' + CAST(@NullCount AS NVARCHAR(10));
    PRINT '   - Already ''Construction'': ' + CAST(@ConstructionCount AS NVARCHAR(10));
    PRINT '   - Already ''Permanent'': ' + CAST(@PermanentCount AS NVARCHAR(10));
    PRINT '';
    
    IF @NullCount = 0
    BEGIN
        PRINT '✅ All participations already have FinancingType set!';
        PRINT '';
        PRINT '============================================================';
        PRINT 'No updates needed.';
        PRINT '============================================================';
        RETURN;
    END
    
    -- Update all NULL FinancingType to 'Construction'
    PRINT '🔄 Setting FinancingType to ''Construction'' for ' + CAST(@NullCount AS NVARCHAR(10)) + ' participation(s)...';
    
    UPDATE banking.Participation
    SET FinancingType = 'Construction',
        UpdatedAt = SYSDATETIME()
    WHERE FinancingType IS NULL;
    
    DECLARE @RowsAffected INT = @@ROWCOUNT;
    PRINT '✅ Updated ' + CAST(@RowsAffected AS NVARCHAR(10)) + ' participation(s) to FinancingType = ''Construction''';
    PRINT '';
    
    -- Verify the update
    PRINT '📊 Final State:';
    SELECT 
        @TotalCount = COUNT(*),
        @NullCount = SUM(CASE WHEN FinancingType IS NULL THEN 1 ELSE 0 END),
        @ConstructionCount = SUM(CASE WHEN FinancingType = 'Construction' THEN 1 ELSE 0 END),
        @PermanentCount = SUM(CASE WHEN FinancingType = 'Permanent' THEN 1 ELSE 0 END)
    FROM banking.Participation;
    
    PRINT '   - Total Participations: ' + CAST(@TotalCount AS NVARCHAR(10));
    PRINT '   - NULL FinancingType: ' + CAST(@NullCount AS NVARCHAR(10));
    PRINT '   - ''Construction'': ' + CAST(@ConstructionCount AS NVARCHAR(10));
    PRINT '   - ''Permanent'': ' + CAST(@PermanentCount AS NVARCHAR(10));
    PRINT '';
    
    IF @NullCount = 0
    BEGIN
        PRINT '✅ Success! All participations now have FinancingType set.';
    END
    ELSE
    BEGIN
        PRINT '⚠️  Warning: ' + CAST(@NullCount AS NVARCHAR(10)) + ' participation(s) still have NULL FinancingType';
    END
    
    PRINT '';
    PRINT '============================================================';
    PRINT 'FinancingType seeding completed!';
    PRINT '============================================================';
    PRINT '';

END TRY
BEGIN CATCH
    PRINT '❌ ERROR during FinancingType seeding: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- Show sample of updated participations
PRINT 'Sample of updated participations:';
SELECT TOP 10
    p.ParticipationId,
    pr.ProjectName,
    b.BankName,
    p.FinancingType,
    p.ParticipationPercent,
    p.ExposureAmount
FROM banking.Participation p
INNER JOIN core.Project pr ON p.ProjectId = pr.ProjectId
INNER JOIN core.Bank b ON p.BankId = b.BankId
ORDER BY p.UpdatedAt DESC;
GO
