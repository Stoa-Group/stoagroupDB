-- ============================================================
-- LIMIT IndexName TO ONLY "Prime" OR "SOFR" FOR CONSTRUCTION FINANCING
-- Index options are now restricted to Prime or SOFR
-- ============================================================

SET NOCOUNT ON;

PRINT '============================================================';
PRINT 'Limiting IndexName options to Prime or SOFR';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. UPDATE EXISTING DATA - NORMALIZE VALUES
-- ============================================================
PRINT '1. Normalizing existing IndexName values...';

-- Set NULL for Fixed rates (no index needed)
UPDATE banking.Loan
SET IndexName = NULL
WHERE FixedOrFloating = 'Fixed'
  AND LoanPhase = 'Construction'
  AND IndexName IS NOT NULL;

DECLARE @FixedCount INT = @@ROWCOUNT;
PRINT '   ✓ Set IndexName to NULL for ' + CAST(@FixedCount AS VARCHAR(10)) + ' Fixed rate loan(s)';

-- Normalize Prime variations to 'Prime'
UPDATE banking.Loan
SET IndexName = 'Prime'
WHERE LoanPhase = 'Construction'
  AND IndexName LIKE '%Prime%'
  AND IndexName NOT IN ('Prime', 'SOFR');

DECLARE @PrimeCount INT = @@ROWCOUNT;
PRINT '   ✓ Normalized ' + CAST(@PrimeCount AS VARCHAR(10)) + ' Prime variation(s) to ''Prime''';

-- Normalize SOFR variations to 'SOFR'
UPDATE banking.Loan
SET IndexName = 'SOFR'
WHERE LoanPhase = 'Construction'
  AND IndexName LIKE '%SOFR%'
  AND IndexName NOT IN ('Prime', 'SOFR');

DECLARE @SOFRCount INT = @@ROWCOUNT;
PRINT '   ✓ Normalized ' + CAST(@SOFRCount AS VARCHAR(10)) + ' SOFR variation(s) to ''SOFR''';

-- Set NULL for any remaining invalid values (like percentages, N/A, etc.)
UPDATE banking.Loan
SET IndexName = NULL
WHERE LoanPhase = 'Construction'
  AND IndexName IS NOT NULL
  AND IndexName NOT IN ('Prime', 'SOFR');

DECLARE @InvalidCount INT = @@ROWCOUNT;
PRINT '   ✓ Set ' + CAST(@InvalidCount AS VARCHAR(10)) + ' invalid value(s) to NULL';

-- ============================================================
-- 2. ADD CHECK CONSTRAINT TO LIMIT VALUES
-- ============================================================
PRINT '';
PRINT '2. Adding CHECK constraint to limit IndexName values...';

-- Drop existing constraint if it exists
IF EXISTS (
    SELECT 1 
    FROM sys.check_constraints 
    WHERE name = 'CK_Loan_IndexName_Construction'
    AND parent_object_id = OBJECT_ID('banking.Loan')
)
BEGIN
    ALTER TABLE banking.Loan
    DROP CONSTRAINT CK_Loan_IndexName_Construction;
    PRINT '   ✓ Dropped existing constraint';
END

-- Add new constraint: IndexName must be NULL, 'Prime', or 'SOFR' for Construction loans
ALTER TABLE banking.Loan
ADD CONSTRAINT CK_Loan_IndexName_Construction 
CHECK (
    LoanPhase <> 'Construction' 
    OR IndexName IS NULL 
    OR IndexName IN ('Prime', 'SOFR')
);

PRINT '   ✓ Added CHECK constraint: IndexName must be NULL, Prime, or SOFR for Construction loans';
GO

-- ============================================================
-- 3. VERIFY CONSTRAINT
-- ============================================================
PRINT '';
PRINT '3. Verifying constraint...';

DECLARE @InvalidCount INT;
SELECT @InvalidCount = COUNT(*)
FROM banking.Loan
WHERE LoanPhase = 'Construction'
  AND IndexName IS NOT NULL
  AND IndexName NOT IN ('Prime', 'SOFR');

IF @InvalidCount = 0
BEGIN
    PRINT '   ✓ All Construction loans have valid IndexName values (NULL, Prime, or SOFR)';
END
ELSE
BEGIN
    PRINT '   ⚠ WARNING: ' + CAST(@InvalidCount AS VARCHAR(10)) + ' Construction loan(s) have invalid IndexName values';
    PRINT '   → These will need to be updated manually';
END
GO

-- ============================================================
-- 4. UPDATE SCHEMA COMMENT
-- ============================================================
PRINT '';
PRINT '4. Schema updated successfully!';
PRINT '';
PRINT 'IndexName options for Construction financing:';
PRINT '   - NULL (for Fixed rates)';
PRINT '   - Prime';
PRINT '   - SOFR';
PRINT '';
PRINT 'Note: Other loan phases (Permanent, MiniPerm, Land, Other)';
PRINT '      are not restricted by this constraint.';
PRINT '';
