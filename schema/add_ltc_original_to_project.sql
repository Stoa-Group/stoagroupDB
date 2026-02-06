-- Deals LTC: one "LTC (Original)" value per deal (project-level). Store as decimal (e.g. 0.65 = 65%).
-- BACKEND-GUIDE-DEALS-LTC-MISC-LOANS.md §1

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('core.Project') AND name = 'LTCOriginal')
BEGIN
  ALTER TABLE core.Project ADD LTCOriginal DECIMAL(10, 4) NULL;
  PRINT 'Added LTCOriginal to core.Project';
END
ELSE
  PRINT 'LTCOriginal already exists on core.Project';
