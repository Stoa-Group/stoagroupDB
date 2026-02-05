-- Add FinancingType to banking.Covenant if missing (fixes "Invalid column name 'FinancingType'" on Add Covenant).
-- Construction or Permanent; API expects this for covenant create/update.
-- Two batches (GO): column must exist before CHECK constraint can reference it at compile time.

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('banking.Covenant') AND name = 'FinancingType'
)
BEGIN
  ALTER TABLE banking.Covenant ADD FinancingType NVARCHAR(30) NULL;
  PRINT 'Added FinancingType to banking.Covenant';
END
ELSE
  PRINT 'FinancingType already exists on banking.Covenant';

GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('banking.Covenant') AND name = 'CK_Covenant_FinancingType'
)
BEGIN
  ALTER TABLE banking.Covenant
  ADD CONSTRAINT CK_Covenant_FinancingType
  CHECK (FinancingType IS NULL OR FinancingType IN ('Construction', 'Permanent'));
  PRINT 'Added CK_Covenant_FinancingType';
END
ELSE
  PRINT 'CK_Covenant_FinancingType already exists';
