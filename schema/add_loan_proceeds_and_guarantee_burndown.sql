-- ============================================================
-- ADD LOAN PROCEEDS AND GUARANTEE BURNDOWN TRACKING
-- Tracks additional loan draws/disbursements and guarantee reductions over time
-- ============================================================

SET NOCOUNT ON;

PRINT '============================================================';
PRINT 'Adding Loan Proceeds and Guarantee Burndown Tracking';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. LOAN PROCEEDS TABLE (Additional Draws/Disbursements)
-- ============================================================
PRINT '1. Creating banking.LoanProceeds table...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LoanProceeds' AND schema_id = SCHEMA_ID('banking'))
BEGIN
    CREATE TABLE banking.LoanProceeds (
        LoanProceedsId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LoanProceeds PRIMARY KEY,
        ProjectId       INT NOT NULL,
        LoanId          INT NULL,  -- Optional: tie to specific loan
        
        -- Proceeds details
        ProceedsDate    DATE NOT NULL,           -- Date of draw/disbursement
        ProceedsAmount  DECIMAL(18,2) NOT NULL,  -- Amount drawn/disbursed
        CumulativeAmount DECIMAL(18,2) NULL,     -- Cumulative total drawn (calculated or stored)
        
        -- Draw information
        DrawNumber      INT NULL,                -- Draw number (1st, 2nd, 3rd, etc.)
        DrawDescription NVARCHAR(255) NULL,      -- Description of what the draw is for
        
        -- Tracking
        Notes           NVARCHAR(MAX) NULL,
        CreatedAt       DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt       DATETIME2(0) NULL,
        
        CONSTRAINT FK_LoanProceeds_Project FOREIGN KEY (ProjectId) REFERENCES core.Project(ProjectId),
        CONSTRAINT FK_LoanProceeds_Loan    FOREIGN KEY (LoanId) REFERENCES banking.Loan(LoanId)
    );
    
    CREATE INDEX IX_LoanProceeds_Project ON banking.LoanProceeds(ProjectId);
    CREATE INDEX IX_LoanProceeds_Loan ON banking.LoanProceeds(LoanId);
    CREATE INDEX IX_LoanProceeds_Date ON banking.LoanProceeds(ProceedsDate DESC);
    
    PRINT '   ✓ Created banking.LoanProceeds table';
END
ELSE
BEGIN
    PRINT '   ✓ banking.LoanProceeds table already exists';
END
GO

-- ============================================================
-- 2. GUARANTEE BURNDOWN TABLE (Guarantee Reductions Over Time)
-- ============================================================
PRINT '';
PRINT '2. Creating banking.GuaranteeBurndown table...';

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'GuaranteeBurndown' AND schema_id = SCHEMA_ID('banking'))
BEGIN
    CREATE TABLE banking.GuaranteeBurndown (
        GuaranteeBurndownId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GuaranteeBurndown PRIMARY KEY,
        ProjectId           INT NOT NULL,
        LoanId              INT NULL,  -- Optional: tie to specific loan
        PersonId            INT NOT NULL,  -- Guarantor
        
        -- Burndown details
        BurndownDate       DATE NOT NULL,           -- Date of guarantee reduction
        PreviousAmount     DECIMAL(18,2) NULL,      -- Guarantee amount before reduction
        NewAmount          DECIMAL(18,2) NOT NULL,  -- Guarantee amount after reduction
        ReductionAmount    DECIMAL(18,2) NULL,      -- Amount reduced (PreviousAmount - NewAmount)
        
        -- Percentage tracking
        PreviousPercent    DECIMAL(10,4) NULL,      -- Guarantee % before reduction
        NewPercent         DECIMAL(10,4) NULL,      -- Guarantee % after reduction
        
        -- Reason/Trigger
        BurndownReason     NVARCHAR(255) NULL,      -- Reason for reduction (e.g., "DSCR reached 1.25x", "Milestone achieved")
        TriggeredBy        NVARCHAR(100) NULL,      -- What triggered the burndown (e.g., "DSCR Test 1", "Covenant Met")
        
        -- Tracking
        Notes              NVARCHAR(MAX) NULL,
        CreatedAt          DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt          DATETIME2(0) NULL,
        
        CONSTRAINT FK_GuaranteeBurndown_Project FOREIGN KEY (ProjectId) REFERENCES core.Project(ProjectId),
        CONSTRAINT FK_GuaranteeBurndown_Loan    FOREIGN KEY (LoanId) REFERENCES banking.Loan(LoanId),
        CONSTRAINT FK_GuaranteeBurndown_Person  FOREIGN KEY (PersonId) REFERENCES core.Person(PersonId)
    );
    
    CREATE INDEX IX_GuaranteeBurndown_Project ON banking.GuaranteeBurndown(ProjectId);
    CREATE INDEX IX_GuaranteeBurndown_Loan ON banking.GuaranteeBurndown(LoanId);
    CREATE INDEX IX_GuaranteeBurndown_Person ON banking.GuaranteeBurndown(PersonId);
    CREATE INDEX IX_GuaranteeBurndown_Date ON banking.GuaranteeBurndown(BurndownDate DESC);
    
    PRINT '   ✓ Created banking.GuaranteeBurndown table';
END
ELSE
BEGIN
    PRINT '   ✓ banking.GuaranteeBurndown table already exists';
END
GO

-- ============================================================
-- 3. HELPER VIEW: Current Loan Proceeds Summary
-- ============================================================
PRINT '';
PRINT '3. Creating helper views...';

IF OBJECT_ID('banking.vw_LoanProceedsSummary', 'V') IS NOT NULL
    DROP VIEW banking.vw_LoanProceedsSummary;
GO

CREATE VIEW banking.vw_LoanProceedsSummary AS
SELECT 
    lp.ProjectId,
    lp.LoanId,
    COUNT(*) AS TotalDraws,
    SUM(lp.ProceedsAmount) AS TotalProceeds,
    MAX(lp.ProceedsDate) AS LastDrawDate,
    MAX(lp.CumulativeAmount) AS CumulativeAmount
FROM banking.LoanProceeds lp
GROUP BY lp.ProjectId, lp.LoanId;
GO

PRINT '   ✓ Created banking.vw_LoanProceedsSummary view';

-- ============================================================
-- 4. HELPER VIEW: Current Guarantee Amounts (with burndowns)
-- ============================================================
IF OBJECT_ID('banking.vw_CurrentGuaranteeAmounts', 'V') IS NOT NULL
    DROP VIEW banking.vw_CurrentGuaranteeAmounts;
GO

CREATE VIEW banking.vw_CurrentGuaranteeAmounts AS
SELECT 
    g.ProjectId,
    g.LoanId,
    g.PersonId,
    p.FullName AS GuarantorName,
    -- Get the most recent burndown amount, or original guarantee amount
    COALESCE(
        (SELECT TOP 1 gb.NewAmount 
         FROM banking.GuaranteeBurndown gb 
         WHERE gb.ProjectId = g.ProjectId 
           AND gb.PersonId = g.PersonId 
           AND (gb.LoanId = g.LoanId OR (gb.LoanId IS NULL AND g.LoanId IS NULL))
         ORDER BY gb.BurndownDate DESC),
        g.GuaranteeAmount
    ) AS CurrentGuaranteeAmount,
    -- Get the most recent burndown percent, or original guarantee percent
    COALESCE(
        (SELECT TOP 1 gb.NewPercent 
         FROM banking.GuaranteeBurndown gb 
         WHERE gb.ProjectId = g.ProjectId 
           AND gb.PersonId = g.PersonId 
           AND (gb.LoanId = g.LoanId OR (gb.LoanId IS NULL AND g.LoanId IS NULL))
         ORDER BY gb.BurndownDate DESC),
        g.GuaranteePercent
    ) AS CurrentGuaranteePercent,
    g.GuaranteeAmount AS OriginalGuaranteeAmount,
    g.GuaranteePercent AS OriginalGuaranteePercent
FROM banking.Guarantee g
INNER JOIN core.Person p ON p.PersonId = g.PersonId;
GO

PRINT '   ✓ Created banking.vw_CurrentGuaranteeAmounts view';

PRINT '';
PRINT '============================================================';
PRINT 'Loan Proceeds and Guarantee Burndown tracking added!';
PRINT '============================================================';
PRINT '';
PRINT 'New Tables:';
PRINT '  ✓ banking.LoanProceeds - Track loan draws/disbursements over time';
PRINT '  ✓ banking.GuaranteeBurndown - Track guarantee reductions over time';
PRINT '';
PRINT 'Helper Views:';
PRINT '  ✓ banking.vw_LoanProceedsSummary - Summary of all draws per loan';
PRINT '  ✓ banking.vw_CurrentGuaranteeAmounts - Current guarantee amounts (after burndowns)';
PRINT '';
PRINT 'Usage:';
PRINT '  - Record each loan draw: INSERT INTO banking.LoanProceeds (...)';
PRINT '  - Record guarantee reduction: INSERT INTO banking.GuaranteeBurndown (...)';
PRINT '  - Query current state: SELECT * FROM banking.vw_CurrentGuaranteeAmounts';
PRINT '';
