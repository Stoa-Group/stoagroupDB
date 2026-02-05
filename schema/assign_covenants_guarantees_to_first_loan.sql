-- Tie all covenants and personal guarantees to each project's "first" loan (lowest LoanId).
-- Use case: Covenants, guarantees (and equity commitments if loan-specific) are per-loan;
-- Debt Structure and Banking Files are per-project. After creating additional loans per
-- property, existing covenant/guarantee rows should point at the first loan so the extra
-- loans can be deleted without "has associations" errors.
--
-- Note: banking.EquityCommitment has no LoanId in the current schema (project-level only).
-- If you add LoanId to EquityCommitment later, run a similar UPDATE using the same
-- first-loan-per-project pattern.

SET NOCOUNT ON;

-- First loan per project (lowest LoanId) – use temp table so both UPDATEs can reference it
SELECT ProjectId, MIN(LoanId) AS LoanId
INTO #FirstLoan
FROM banking.Loan
GROUP BY ProjectId;

-- Covenants: set LoanId to project's first loan where not already set or wrong
UPDATE c
SET c.LoanId = f.LoanId
FROM banking.Covenant c
INNER JOIN #FirstLoan f ON c.ProjectId = f.ProjectId
WHERE c.LoanId IS NULL OR c.LoanId <> f.LoanId;

PRINT 'Covenants: updated LoanId to first loan per project.';

-- Guarantees: set LoanId to project's first loan where not already set or wrong
UPDATE g
SET g.LoanId = f.LoanId
FROM banking.Guarantee g
INNER JOIN #FirstLoan f ON g.ProjectId = f.ProjectId
WHERE g.LoanId IS NULL OR g.LoanId <> f.LoanId;

PRINT 'Guarantees: updated LoanId to first loan per project.';

PRINT 'Done. Debt Structure (participations) and Banking Files remain project-level.';
