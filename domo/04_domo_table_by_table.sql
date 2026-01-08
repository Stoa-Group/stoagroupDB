-- ============================================================
-- DOMO - ONE QUERY PER TABLE
-- Copy each query individually into Domo to create separate DataSets
-- ============================================================

-- ============================================================
-- CORE SCHEMA TABLES
-- ============================================================

-- 1. core.Project
SELECT * FROM core.Project ORDER BY ProjectName;

-- 2. core.Bank
SELECT * FROM core.Bank ORDER BY BankName;

-- 3. core.Person
SELECT * FROM core.Person ORDER BY FullName;

-- 4. core.EquityPartner
SELECT * FROM core.EquityPartner ORDER BY PartnerName;

-- ============================================================
-- BANKING SCHEMA TABLES
-- ============================================================

-- 5. banking.Loan
SELECT * FROM banking.Loan ORDER BY ProjectId, LoanPhase;

-- 6. banking.DSCRTest
SELECT * FROM banking.DSCRTest ORDER BY ProjectId, TestNumber;

-- 7. banking.Covenant
SELECT * FROM banking.Covenant ORDER BY ProjectId;

-- 8. banking.LiquidityRequirement
SELECT * FROM banking.LiquidityRequirement ORDER BY ProjectId;

-- 9. banking.Participation
SELECT * FROM banking.Participation ORDER BY ProjectId, BankId;

-- 10. banking.Guarantee
SELECT * FROM banking.Guarantee ORDER BY ProjectId, PersonId;

-- 11. banking.BankTarget
SELECT * FROM banking.BankTarget ORDER BY BankId;

-- 12. banking.EquityCommitment
SELECT * FROM banking.EquityCommitment ORDER BY ProjectId;

-- ============================================================
-- PIPELINE SCHEMA TABLES
-- ============================================================

-- 13. pipeline.UnderContract
SELECT * FROM pipeline.UnderContract ORDER BY ProjectId;

-- 14. pipeline.CommercialListed
SELECT * FROM pipeline.CommercialListed ORDER BY ProjectId;

-- 15. pipeline.CommercialAcreage
SELECT * FROM pipeline.CommercialAcreage ORDER BY ProjectId;

-- 16. pipeline.ClosedProperty
SELECT * FROM pipeline.ClosedProperty ORDER BY ProjectId;

