-- §7 BACKEND-GUIDE-DEALS-LTC-MISC-LOANS: Equity commitments are deal-wide; add "paid off" flag.
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.EquityCommitment') AND name = 'IsPaidOff')
BEGIN
  ALTER TABLE banking.EquityCommitment ADD IsPaidOff BIT NULL DEFAULT 0;
  PRINT 'Added IsPaidOff to banking.EquityCommitment';
END
ELSE
  PRINT 'IsPaidOff already exists on banking.EquityCommitment';
