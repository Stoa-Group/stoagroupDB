-- ============================================================
-- UPDATE pipeline.CommercialAcreage FOR LAND DEVELOPMENT
-- Remove redundant fields (Location) - pull from CORE instead
-- Keep only Land Development specific attributes
-- ============================================================

SET NOCOUNT ON;

PRINT 'Updating pipeline.CommercialAcreage table for Land Development...';

-- Check if Location column exists and remove it (use City/State from CORE instead)
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.CommercialAcreage') 
    AND name = 'Location'
)
BEGIN
    ALTER TABLE pipeline.CommercialAcreage DROP COLUMN Location;
    PRINT '✓ Removed Location column (use City/State from core.Project instead)';
END
ELSE
BEGIN
    PRINT '✓ Location column does not exist (already removed)';
END
GO

PRINT '';
PRINT 'Commercial Acreage table structure updated!';
PRINT 'Removed redundant fields: Location';
PRINT 'Location will now be pulled from core.Project (City, State)';
PRINT '';
PRINT 'Commercial Acreage specific fields:';
PRINT '  - Acreage';
PRINT '  - SquareFootage';
PRINT '  - BuildingFootprintSF';
PRINT '';
