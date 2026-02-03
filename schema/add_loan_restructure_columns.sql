-- Loans Restructure (BACKEND-GUIDE-LOANS-RESTRUCTURE.md):
-- - Multiple loans per project (already supported; no unique constraint).
-- - IsActive: mark loan as active vs paid off for dashboard "active financing" view.
-- - InterestRateFloor / InterestRateCeiling: optional rate caps/floors.
-- - IsPrimary: optional flag for "display" loan in property summary row.

-- IsActive (bit): 1 = active, 0 = paid off. Default 1 for new loans.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Loan') AND name = 'IsActive')
BEGIN
  ALTER TABLE banking.Loan ADD IsActive BIT NOT NULL DEFAULT 1;
  PRINT 'Added IsActive to banking.Loan';
END
ELSE
  PRINT 'IsActive already exists on banking.Loan';

-- InterestRateFloor: e.g. "2.00%" or 2.0 (stored as NVARCHAR like InterestRate/Spread)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Loan') AND name = 'InterestRateFloor')
BEGIN
  ALTER TABLE banking.Loan ADD InterestRateFloor NVARCHAR(50) NULL;
  PRINT 'Added InterestRateFloor to banking.Loan';
END
ELSE
  PRINT 'InterestRateFloor already exists on banking.Loan';

-- InterestRateCeiling: e.g. "8.50%" or 8.5
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Loan') AND name = 'InterestRateCeiling')
BEGIN
  ALTER TABLE banking.Loan ADD InterestRateCeiling NVARCHAR(50) NULL;
  PRINT 'Added InterestRateCeiling to banking.Loan';
END
ELSE
  PRINT 'InterestRateCeiling already exists on banking.Loan';

-- IsPrimary (optional): at most one per project for summary row; frontend can fall back to first active loan
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Loan') AND name = 'IsPrimary')
BEGIN
  ALTER TABLE banking.Loan ADD IsPrimary BIT NULL DEFAULT 0;
  PRINT 'Added IsPrimary to banking.Loan';
END
ELSE
  PRINT 'IsPrimary already exists on banking.Loan';

GO

-- Ensure existing rows are active (in case IsActive was added without default in an older run)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Loan') AND name = 'IsActive')
  UPDATE banking.Loan SET IsActive = 1 WHERE IsActive IS NULL;
