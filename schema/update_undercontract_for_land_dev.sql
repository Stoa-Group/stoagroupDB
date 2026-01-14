-- ============================================================
-- UPDATE pipeline.UnderContract FOR LAND DEVELOPMENT
-- Remove redundant fields (Location, Region, Units) - pull from CORE instead
-- Keep only Land Development specific attributes
-- ============================================================

SET NOCOUNT ON;

PRINT 'Updating pipeline.UnderContract table for Land Development...';

-- Check if Location column exists and remove it (use City/State from CORE instead)
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'Location'
)
BEGIN
    ALTER TABLE pipeline.UnderContract DROP COLUMN Location;
    PRINT '✓ Removed Location column (use City/State from core.Project instead)';
END
ELSE
BEGIN
    PRINT '✓ Location column does not exist (already removed)';
END
GO

-- Check if Region column exists and remove it (use Region from CORE.Region table instead)
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'Region'
)
BEGIN
    ALTER TABLE pipeline.UnderContract DROP COLUMN Region;
    PRINT '✓ Removed Region column (use core.Region table instead)';
END
ELSE
BEGIN
    PRINT '✓ Region column does not exist (already removed)';
END
GO

-- Check if Units column exists and remove it (use Units from core.Project instead)
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'Units'
)
BEGIN
    ALTER TABLE pipeline.UnderContract DROP COLUMN Units;
    PRINT '✓ Removed Units column (use Units from core.Project instead)';
END
ELSE
BEGIN
    PRINT '✓ Units column does not exist (already removed)';
END
GO

-- Rename Price to LandPrice for clarity
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'Price'
)
BEGIN
    EXEC sp_rename 'pipeline.UnderContract.Price', 'LandPrice', 'COLUMN';
    PRINT '✓ Renamed Price to LandPrice';
END
ELSE IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'LandPrice'
)
BEGIN
    PRINT '✓ LandPrice column already exists';
END
GO

-- Rename PricePerSF to SqFtPrice for clarity
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'PricePerSF'
)
BEGIN
    EXEC sp_rename 'pipeline.UnderContract.PricePerSF', 'SqFtPrice', 'COLUMN';
    PRINT '✓ Renamed PricePerSF to SqFtPrice';
END
ELSE IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'SqFtPrice'
)
BEGIN
    PRINT '✓ SqFtPrice column already exists';
END
GO

-- Rename CashFlag to Cash for clarity
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'CashFlag'
)
BEGIN
    EXEC sp_rename 'pipeline.UnderContract.CashFlag', 'Cash', 'COLUMN';
    PRINT '✓ Renamed CashFlag to Cash';
END
ELSE IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'Cash'
)
BEGIN
    PRINT '✓ Cash column already exists';
END
GO

-- Rename ExtensionNotes to ClosingNotes for clarity
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'ExtensionNotes'
)
BEGIN
    EXEC sp_rename 'pipeline.UnderContract.ExtensionNotes', 'ClosingNotes', 'COLUMN';
    PRINT '✓ Renamed ExtensionNotes to ClosingNotes';
END
ELSE IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('pipeline.UnderContract') 
    AND name = 'ClosingNotes'
)
BEGIN
    PRINT '✓ ClosingNotes column already exists';
END
GO

PRINT '';
PRINT 'Land Development table structure updated!';
PRINT 'Removed redundant fields: Location, Region, Units';
PRINT 'These will now be pulled from core.Project and core.Region';
PRINT '';
PRINT 'Land Development specific fields:';
PRINT '  - Acreage';
PRINT '  - LandPrice';
PRINT '  - SqFtPrice (calculated: LandPrice / (Acreage * 43560))';
PRINT '  - ExecutionDate';
PRINT '  - DueDiligenceDate';
PRINT '  - ClosingDate';
PRINT '  - PurchasingEntity';
PRINT '  - Cash (boolean)';
PRINT '  - OpportunityZone (boolean)';
PRINT '  - ClosingNotes';
PRINT '';
