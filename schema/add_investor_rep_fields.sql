-- ============================================================
-- ADD INVESTOR REP FIELDS TO EQUITY PARTNER
-- Add InvestorRepName, InvestorRepEmail, InvestorRepPhone
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Adding Investor Rep fields to core.EquityPartner';
PRINT '============================================================';
PRINT '';

BEGIN TRY
    -- ============================================================
    -- 1. ADD INVESTOR REP COLUMNS
    -- ============================================================
    PRINT '1. Adding Investor Rep columns...';
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('core.EquityPartner')
        AND name = 'InvestorRepName'
    )
    BEGIN
        ALTER TABLE core.EquityPartner
        ADD InvestorRepName NVARCHAR(255) NULL;
        PRINT '   ✓ Added InvestorRepName column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ InvestorRepName column already exists';
    END
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('core.EquityPartner')
        AND name = 'InvestorRepEmail'
    )
    BEGIN
        ALTER TABLE core.EquityPartner
        ADD InvestorRepEmail NVARCHAR(255) NULL;
        PRINT '   ✓ Added InvestorRepEmail column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ InvestorRepEmail column already exists';
    END
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('core.EquityPartner')
        AND name = 'InvestorRepPhone'
    )
    BEGIN
        ALTER TABLE core.EquityPartner
        ADD InvestorRepPhone NVARCHAR(50) NULL;
        PRINT '   ✓ Added InvestorRepPhone column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ InvestorRepPhone column already exists';
    END
    PRINT '';

    PRINT '============================================================';
    PRINT 'Investor Rep fields added successfully!';
    PRINT '============================================================';
    PRINT '';

END TRY
BEGIN CATCH
    PRINT '❌ ERROR during Investor Rep fields addition: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO
