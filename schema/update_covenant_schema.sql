-- ============================================================
-- UPDATE COVENANT SCHEMA FOR CONDITIONAL FIELDS
-- Adds fields for DSCR, Occupancy, and Liquidity Requirement covenants
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Updating banking.Covenant schema for conditional fields';
PRINT '============================================================';
PRINT '';

BEGIN TRY
    -- ============================================================
    -- 1. ADD NEW COLUMNS FOR DSCR COVENANTS
    -- ============================================================
    PRINT '1. Adding DSCR covenant fields...';
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'DSCRTestDate')
    BEGIN
        ALTER TABLE banking.Covenant ADD DSCRTestDate DATE NULL;
        PRINT '   ✓ Added DSCRTestDate column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ DSCRTestDate column already exists';
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'ProjectedInterestRate')
    BEGIN
        ALTER TABLE banking.Covenant ADD ProjectedInterestRate NVARCHAR(50) NULL;
        PRINT '   ✓ Added ProjectedInterestRate column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ ProjectedInterestRate column already exists';
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'DSCRRequirement')
    BEGIN
        ALTER TABLE banking.Covenant ADD DSCRRequirement NVARCHAR(100) NULL;
        PRINT '   ✓ Added DSCRRequirement column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ DSCRRequirement column already exists';
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'ProjectedDSCR')
    BEGIN
        ALTER TABLE banking.Covenant ADD ProjectedDSCR NVARCHAR(50) NULL;
        PRINT '   ✓ Added ProjectedDSCR column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ ProjectedDSCR column already exists';
    END
    PRINT '';
    
    -- ============================================================
    -- 2. ADD NEW COLUMNS FOR OCCUPANCY COVENANTS
    -- ============================================================
    PRINT '2. Adding Occupancy covenant fields...';
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'OccupancyCovenantDate')
    BEGIN
        ALTER TABLE banking.Covenant ADD OccupancyCovenantDate DATE NULL;
        PRINT '   ✓ Added OccupancyCovenantDate column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ OccupancyCovenantDate column already exists';
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'OccupancyRequirement')
    BEGIN
        ALTER TABLE banking.Covenant ADD OccupancyRequirement NVARCHAR(100) NULL;
        PRINT '   ✓ Added OccupancyRequirement column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ OccupancyRequirement column already exists';
    END
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'ProjectedOccupancy')
    BEGIN
        ALTER TABLE banking.Covenant ADD ProjectedOccupancy NVARCHAR(50) NULL;
        PRINT '   ✓ Added ProjectedOccupancy column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ ProjectedOccupancy column already exists';
    END
    PRINT '';
    
    -- ============================================================
    -- 3. ADD NEW COLUMN FOR LIQUIDITY REQUIREMENT COVENANTS
    -- ============================================================
    PRINT '3. Adding Liquidity Requirement covenant field...';
    
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'LiquidityRequirementLendingBank')
    BEGIN
        ALTER TABLE banking.Covenant ADD LiquidityRequirementLendingBank DECIMAL(18,2) NULL;
        PRINT '   ✓ Added LiquidityRequirementLendingBank column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ LiquidityRequirementLendingBank column already exists';
    END
    PRINT '';
    
    -- ============================================================
    -- 4. UPDATE EXISTING DATA (MIGRATE OLD FIELDS TO NEW STRUCTURE)
    -- ============================================================
    PRINT '4. Migrating existing data...';
    
    -- Migrate Occupancy covenants
    UPDATE banking.Covenant
    SET OccupancyCovenantDate = CovenantDate,
        OccupancyRequirement = Requirement,
        ProjectedOccupancy = ProjectedValue
    WHERE CovenantType = 'Occupancy'
      AND (OccupancyCovenantDate IS NULL OR OccupancyRequirement IS NULL OR ProjectedOccupancy IS NULL);
    
    DECLARE @OccupancyMigrated INT = @@ROWCOUNT;
    PRINT '   ✓ Migrated ' + CAST(@OccupancyMigrated AS NVARCHAR(10)) + ' Occupancy covenant(s)';
    
    -- Migrate Liquidity covenants
    UPDATE banking.Covenant
    SET LiquidityRequirementLendingBank = TRY_CAST(Requirement AS DECIMAL(18,2))
    WHERE CovenantType = 'Liquidity'
      AND LiquidityRequirementLendingBank IS NULL
      AND Requirement IS NOT NULL;
    
    DECLARE @LiquidityMigrated INT = @@ROWCOUNT;
    PRINT '   ✓ Migrated ' + CAST(@LiquidityMigrated AS NVARCHAR(10)) + ' Liquidity covenant(s)';
    PRINT '';
    
    PRINT '============================================================';
    PRINT 'Covenant schema update completed!';
    PRINT '============================================================';
    PRINT '';
    PRINT 'New CovenantType options: DSCR, Occupancy, Liquidity Requirement, Other';
    PRINT '';
    PRINT 'Field mapping:';
    PRINT '  DSCR: DSCRTestDate, ProjectedInterestRate, DSCRRequirement, ProjectedDSCR';
    PRINT '  Occupancy: OccupancyCovenantDate, OccupancyRequirement, ProjectedOccupancy';
    PRINT '  Liquidity Requirement: LiquidityRequirementLendingBank';
    PRINT '  Other: CovenantDate, Requirement, ProjectedValue (existing fields)';
    PRINT '';

END TRY
BEGIN CATCH
    PRINT '❌ ERROR during covenant schema update: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO
