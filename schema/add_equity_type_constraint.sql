-- ============================================================
-- ADD CHECK CONSTRAINT FOR EquityType IN banking.EquityCommitment
-- Allows: 'Preferred Equity', 'Common Equity', 'Profits Interest'
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Adding CHECK constraint for EquityType in banking.EquityCommitment';
PRINT '============================================================';
PRINT '';

BEGIN TRY
    -- Step 1: Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('banking.EquityCommitment')
          AND name = 'CK_EquityCommitment_EquityType'
    )
    BEGIN
        PRINT '1. Dropping existing CK_EquityCommitment_EquityType constraint...';
        ALTER TABLE banking.EquityCommitment
        DROP CONSTRAINT CK_EquityCommitment_EquityType;
        PRINT '   ✓ Constraint dropped';
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '1. No existing constraint found (this is expected for new installations)';
        PRINT '';
    END

    -- Step 2: Normalize existing EquityType values to match new constraint
    PRINT '2. Normalizing existing EquityType values...';
    
    -- Update common variations to standard values
    UPDATE banking.EquityCommitment
    SET EquityType = 'Preferred Equity'
    WHERE EquityType IS NOT NULL
      AND (
          EquityType LIKE '%Pref%' COLLATE Latin1_General_CI_AS
          OR EquityType = 'Pref'
          OR EquityType = 'Preferred'
      );
    DECLARE @PrefUpdated INT = @@ROWCOUNT;
    PRINT '   ✓ Updated ' + CAST(@PrefUpdated AS NVARCHAR(10)) + ' records to ''Preferred Equity''';
    
    UPDATE banking.EquityCommitment
    SET EquityType = 'Common Equity'
    WHERE EquityType IS NOT NULL
      AND (
          EquityType LIKE '%Common%' COLLATE Latin1_General_CI_AS
          OR EquityType = 'Common'
      );
    DECLARE @CommonUpdated INT = @@ROWCOUNT;
    PRINT '   ✓ Updated ' + CAST(@CommonUpdated AS NVARCHAR(10)) + ' records to ''Common Equity''';
    PRINT '';

    -- Step 3: Add the constraint
    PRINT '3. Adding CHECK constraint CK_EquityCommitment_EquityType...';
    ALTER TABLE banking.EquityCommitment
    ADD CONSTRAINT CK_EquityCommitment_EquityType 
    CHECK (EquityType IS NULL OR EquityType IN ('Preferred Equity', 'Common Equity', 'Profits Interest'));
    PRINT '   ✓ Constraint added successfully';
    PRINT '';

    PRINT '============================================================';
    PRINT 'EquityType constraint added successfully!';
    PRINT 'Allowed values: Preferred Equity, Common Equity, Profits Interest';
    PRINT '============================================================';
    PRINT '';

END TRY
BEGIN CATCH
    PRINT '❌ ERROR adding EquityType constraint: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO

-- Verification
PRINT 'Verifying constraint exists:';
SELECT 
    name AS ConstraintName,
    definition AS ConstraintDefinition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('banking.EquityCommitment')
  AND name = 'CK_EquityCommitment_EquityType';
GO
