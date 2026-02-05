-- Boss Morning Feedback: Principal paydowns / current balance.
-- BACKEND-GUIDE-BOSS-MORNING-FEEDBACK.md §10

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Loan') AND name = 'CurrentBalance')
BEGIN
  ALTER TABLE banking.Loan ADD CurrentBalance DECIMAL(18,2) NULL;
  PRINT 'Added CurrentBalance to banking.Loan (outstanding principal; NULL = use LoanAmount).';
END
ELSE
  PRINT 'CurrentBalance already exists on banking.Loan';
