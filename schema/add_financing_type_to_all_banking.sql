-- ============================================================
-- ADD FinancingType TO ALL BANKING ENTITIES
-- Adds Construction/Permanent financing type separation to:
-- - DSCRTest
-- - Covenant
-- - Guarantee
-- - LiquidityRequirement
-- - LoanProceeds (if exists)
-- - GuaranteeBurndown (if exists)
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Adding FinancingType to all banking entities';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. DSCRTest
-- ============================================================
BEGIN TRY
    PRINT '1. Adding FinancingType to banking.DSCRTest...';
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('banking.DSCRTest')
        AND name = 'FinancingType'
    )
    BEGIN
        ALTER TABLE banking.DSCRTest
        ADD FinancingType NVARCHAR(30) NULL;
        
        PRINT '   ✓ Added FinancingType column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ FinancingType column already exists';
    END
    
    -- Add CHECK constraint
    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('banking.DSCRTest')
        AND name = 'CK_DSCRTest_FinancingType'
    )
    BEGIN
        ALTER TABLE banking.DSCRTest
        ADD CONSTRAINT CK_DSCRTest_FinancingType 
        CHECK (FinancingType IS NULL OR FinancingType IN ('Construction', 'Permanent'));
        
        PRINT '   ✓ Added CHECK constraint';
    END
    
    PRINT '';
END TRY
BEGIN CATCH
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- ============================================================
-- 2. Covenant
-- ============================================================
BEGIN TRY
    PRINT '2. Adding FinancingType to banking.Covenant...';
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('banking.Covenant')
        AND name = 'FinancingType'
    )
    BEGIN
        ALTER TABLE banking.Covenant
        ADD FinancingType NVARCHAR(30) NULL;
        
        PRINT '   ✓ Added FinancingType column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ FinancingType column already exists';
    END
    
    -- Add CHECK constraint
    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('banking.Covenant')
        AND name = 'CK_Covenant_FinancingType'
    )
    BEGIN
        ALTER TABLE banking.Covenant
        ADD CONSTRAINT CK_Covenant_FinancingType 
        CHECK (FinancingType IS NULL OR FinancingType IN ('Construction', 'Permanent'));
        
        PRINT '   ✓ Added CHECK constraint';
    END
    
    PRINT '';
END TRY
BEGIN CATCH
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- ============================================================
-- 3. Guarantee
-- ============================================================
BEGIN TRY
    PRINT '3. Adding FinancingType to banking.Guarantee...';
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('banking.Guarantee')
        AND name = 'FinancingType'
    )
    BEGIN
        ALTER TABLE banking.Guarantee
        ADD FinancingType NVARCHAR(30) NULL;
        
        PRINT '   ✓ Added FinancingType column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ FinancingType column already exists';
    END
    
    -- Add CHECK constraint
    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('banking.Guarantee')
        AND name = 'CK_Guarantee_FinancingType'
    )
    BEGIN
        ALTER TABLE banking.Guarantee
        ADD CONSTRAINT CK_Guarantee_FinancingType 
        CHECK (FinancingType IS NULL OR FinancingType IN ('Construction', 'Permanent'));
        
        PRINT '   ✓ Added CHECK constraint';
    END
    
    PRINT '';
END TRY
BEGIN CATCH
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- ============================================================
-- 4. LiquidityRequirement
-- ============================================================
BEGIN TRY
    PRINT '4. Adding FinancingType to banking.LiquidityRequirement...';
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('banking.LiquidityRequirement')
        AND name = 'FinancingType'
    )
    BEGIN
        ALTER TABLE banking.LiquidityRequirement
        ADD FinancingType NVARCHAR(30) NULL;
        
        PRINT '   ✓ Added FinancingType column';
    END
    ELSE
    BEGIN
        PRINT '   ✓ FinancingType column already exists';
    END
    
    -- Add CHECK constraint
    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('banking.LiquidityRequirement')
        AND name = 'CK_LiquidityRequirement_FinancingType'
    )
    BEGIN
        ALTER TABLE banking.LiquidityRequirement
        ADD CONSTRAINT CK_LiquidityRequirement_FinancingType 
        CHECK (FinancingType IS NULL OR FinancingType IN ('Construction', 'Permanent'));
        
        PRINT '   ✓ Added CHECK constraint';
    END
    
    PRINT '';
END TRY
BEGIN CATCH
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- ============================================================
-- 5. LoanProceeds (if table exists)
-- ============================================================
BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LoanProceeds' AND schema_id = SCHEMA_ID('banking'))
    BEGIN
        PRINT '5. Adding FinancingType to banking.LoanProceeds...';
        
        IF NOT EXISTS (
            SELECT 1
            FROM sys.columns
            WHERE object_id = OBJECT_ID('banking.LoanProceeds')
            AND name = 'FinancingType'
        )
        BEGIN
            ALTER TABLE banking.LoanProceeds
            ADD FinancingType NVARCHAR(30) NULL;
            
            PRINT '   ✓ Added FinancingType column';
        END
        ELSE
        BEGIN
            PRINT '   ✓ FinancingType column already exists';
        END
        
        -- Add CHECK constraint
        IF NOT EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE parent_object_id = OBJECT_ID('banking.LoanProceeds')
            AND name = 'CK_LoanProceeds_FinancingType'
        )
        BEGIN
            ALTER TABLE banking.LoanProceeds
            ADD CONSTRAINT CK_LoanProceeds_FinancingType 
            CHECK (FinancingType IS NULL OR FinancingType IN ('Construction', 'Permanent'));
            
            PRINT '   ✓ Added CHECK constraint';
        END
        
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '5. banking.LoanProceeds table does not exist - skipping';
        PRINT '';
    END
END TRY
BEGIN CATCH
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- ============================================================
-- 6. GuaranteeBurndown (if table exists)
-- ============================================================
BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'GuaranteeBurndown' AND schema_id = SCHEMA_ID('banking'))
    BEGIN
        PRINT '6. Adding FinancingType to banking.GuaranteeBurndown...';
        
        IF NOT EXISTS (
            SELECT 1
            FROM sys.columns
            WHERE object_id = OBJECT_ID('banking.GuaranteeBurndown')
            AND name = 'FinancingType'
        )
        BEGIN
            ALTER TABLE banking.GuaranteeBurndown
            ADD FinancingType NVARCHAR(30) NULL;
            
            PRINT '   ✓ Added FinancingType column';
        END
        ELSE
        BEGIN
            PRINT '   ✓ FinancingType column already exists';
        END
        
        -- Add CHECK constraint
        IF NOT EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE parent_object_id = OBJECT_ID('banking.GuaranteeBurndown')
            AND name = 'CK_GuaranteeBurndown_FinancingType'
        )
        BEGIN
            ALTER TABLE banking.GuaranteeBurndown
            ADD CONSTRAINT CK_GuaranteeBurndown_FinancingType 
            CHECK (FinancingType IS NULL OR FinancingType IN ('Construction', 'Permanent'));
            
            PRINT '   ✓ Added CHECK constraint';
        END
        
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '6. banking.GuaranteeBurndown table does not exist - skipping';
        PRINT '';
    END
END TRY
BEGIN CATCH
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- ============================================================
-- 7. SEED EXISTING DATA
-- Set FinancingType based on LoanPhase if LoanId exists
-- ============================================================
BEGIN TRY
    PRINT '7. Seeding FinancingType for existing records...';
    PRINT '';
    
    -- DSCRTest
    PRINT '   Updating banking.DSCRTest...';
    UPDATE dt
    SET dt.FinancingType = 
        CASE 
            WHEN l.LoanPhase = 'Construction' THEN 'Construction'
            WHEN l.LoanPhase = 'Permanent' THEN 'Permanent'
            ELSE 'Construction'  -- Default to Construction
        END
    FROM banking.DSCRTest dt
    LEFT JOIN banking.Loan l ON dt.LoanId = l.LoanId
    WHERE dt.FinancingType IS NULL;
    PRINT '      ✓ Updated ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' DSCRTest records';
    
    -- Set remaining NULLs to Construction
    UPDATE banking.DSCRTest
    SET FinancingType = 'Construction'
    WHERE FinancingType IS NULL;
    
    -- Covenant
    PRINT '   Updating banking.Covenant...';
    UPDATE c
    SET c.FinancingType = 
        CASE 
            WHEN l.LoanPhase = 'Construction' THEN 'Construction'
            WHEN l.LoanPhase = 'Permanent' THEN 'Permanent'
            ELSE 'Construction'  -- Default to Construction
        END
    FROM banking.Covenant c
    LEFT JOIN banking.Loan l ON c.LoanId = l.LoanId
    WHERE c.FinancingType IS NULL;
    PRINT '      ✓ Updated ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' Covenant records';
    
    -- Set remaining NULLs to Construction
    UPDATE banking.Covenant
    SET FinancingType = 'Construction'
    WHERE FinancingType IS NULL;
    
    -- Guarantee
    PRINT '   Updating banking.Guarantee...';
    UPDATE g
    SET g.FinancingType = 
        CASE 
            WHEN l.LoanPhase = 'Construction' THEN 'Construction'
            WHEN l.LoanPhase = 'Permanent' THEN 'Permanent'
            ELSE 'Construction'  -- Default to Construction
        END
    FROM banking.Guarantee g
    LEFT JOIN banking.Loan l ON g.LoanId = l.LoanId
    WHERE g.FinancingType IS NULL;
    PRINT '      ✓ Updated ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' Guarantee records';
    
    -- Set remaining NULLs to Construction
    UPDATE banking.Guarantee
    SET FinancingType = 'Construction'
    WHERE FinancingType IS NULL;
    
    -- LiquidityRequirement
    PRINT '   Updating banking.LiquidityRequirement...';
    UPDATE lr
    SET lr.FinancingType = 
        CASE 
            WHEN l.LoanPhase = 'Construction' THEN 'Construction'
            WHEN l.LoanPhase = 'Permanent' THEN 'Permanent'
            ELSE 'Construction'  -- Default to Construction
        END
    FROM banking.LiquidityRequirement lr
    LEFT JOIN banking.Loan l ON lr.LoanId = l.LoanId
    WHERE lr.FinancingType IS NULL;
    PRINT '      ✓ Updated ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' LiquidityRequirement records';
    
    -- Set remaining NULLs to Construction
    UPDATE banking.LiquidityRequirement
    SET FinancingType = 'Construction'
    WHERE FinancingType IS NULL;
    
    -- LoanProceeds (if exists)
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LoanProceeds' AND schema_id = SCHEMA_ID('banking'))
    BEGIN
        PRINT '   Updating banking.LoanProceeds...';
        UPDATE lp
        SET lp.FinancingType = 
            CASE 
                WHEN l.LoanPhase = 'Construction' THEN 'Construction'
                WHEN l.LoanPhase = 'Permanent' THEN 'Permanent'
                ELSE 'Construction'  -- Default to Construction
            END
        FROM banking.LoanProceeds lp
        LEFT JOIN banking.Loan l ON lp.LoanId = l.LoanId
        WHERE lp.FinancingType IS NULL;
        PRINT '      ✓ Updated ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' LoanProceeds records';
        
        -- Set remaining NULLs to Construction
        UPDATE banking.LoanProceeds
        SET FinancingType = 'Construction'
        WHERE FinancingType IS NULL;
    END
    
    -- GuaranteeBurndown (if exists)
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'GuaranteeBurndown' AND schema_id = SCHEMA_ID('banking'))
    BEGIN
        PRINT '   Updating banking.GuaranteeBurndown...';
        UPDATE gb
        SET gb.FinancingType = 
            CASE 
                WHEN l.LoanPhase = 'Construction' THEN 'Construction'
                WHEN l.LoanPhase = 'Permanent' THEN 'Permanent'
                ELSE 'Construction'  -- Default to Construction
            END
        FROM banking.GuaranteeBurndown gb
        LEFT JOIN banking.Loan l ON gb.LoanId = l.LoanId
        WHERE gb.FinancingType IS NULL;
        PRINT '      ✓ Updated ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' GuaranteeBurndown records';
        
        -- Set remaining NULLs to Construction
        UPDATE banking.GuaranteeBurndown
        SET FinancingType = 'Construction'
        WHERE FinancingType IS NULL;
    END
    
    PRINT '';
END TRY
BEGIN CATCH
    PRINT '❌ ERROR during seeding: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

PRINT '============================================================';
PRINT 'FinancingType added successfully to all banking entities!';
PRINT '============================================================';
PRINT '';
PRINT 'All existing records have been set to ''Construction'' as default.';
PRINT 'Update records manually to ''Permanent'' where appropriate.';
PRINT '';
