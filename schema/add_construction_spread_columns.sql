-- Construction value spread: Cost per unit, Valuation when complete, Spread = Valuation - Cost (per unit)
-- Spread per unit = ValuationWhenComplete - CostPerUnit; Total Spread = Spread per unit × Units
-- BACKEND-GUIDE: Banking Dashboard construction value spread

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('core.Project') AND name = 'CostPerUnit')
BEGIN
  ALTER TABLE core.Project ADD CostPerUnit DECIMAL(18, 2) NULL;
  PRINT 'Added CostPerUnit to core.Project';
END
ELSE
  PRINT 'CostPerUnit already exists on core.Project';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('core.Project') AND name = 'ValuationWhenComplete')
BEGIN
  ALTER TABLE core.Project ADD ValuationWhenComplete DECIMAL(18, 2) NULL;
  PRINT 'Added ValuationWhenComplete to core.Project';
END
ELSE
  PRINT 'ValuationWhenComplete already exists on core.Project';
