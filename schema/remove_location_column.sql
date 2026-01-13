-- ============================================================
-- REMOVE LOCATION COLUMN FROM core.Project
-- Location is redundant - we have City, State, Region, and Address
-- ============================================================

SET NOCOUNT ON;

PRINT 'Removing Location column from core.Project...';

-- Check if Location column exists
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('core.Project') 
    AND name = 'Location'
)
BEGIN
    -- Drop the column
    ALTER TABLE core.Project
    DROP COLUMN Location;
    
    PRINT '✓ Removed Location column from core.Project';
END
ELSE
BEGIN
    PRINT '✓ Location column does not exist in core.Project (already removed)';
END
GO

PRINT '';
PRINT 'Location column removal completed!';
PRINT 'Note: Use City, State, Region, and Address fields instead.';
PRINT '';
