-- ============================================================
-- ADD RELATED PARTIES TABLE FOR EQUITY COMMITMENTS
-- Allows tracking multiple related parties per equity commitment
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'Adding Related Parties table for Equity Commitments';
PRINT '============================================================';
PRINT '';

BEGIN TRY
    -- ============================================================
    -- 1. CREATE RELATED PARTIES JUNCTION TABLE
    -- ============================================================
    PRINT '1. Creating banking.EquityCommitmentRelatedParty table...';
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.tables
        WHERE name = 'EquityCommitmentRelatedParty'
        AND schema_id = SCHEMA_ID('banking')
    )
    BEGIN
        CREATE TABLE banking.EquityCommitmentRelatedParty (
            EquityCommitmentRelatedPartyId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EquityCommitmentRelatedParty PRIMARY KEY,
            EquityCommitmentId              INT NOT NULL,
            RelatedPartyId                  INT NOT NULL,  -- FK to core.EquityPartner
            
            CreatedAt DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            
            CONSTRAINT FK_EquityCommitmentRelatedParty_Commitment FOREIGN KEY (EquityCommitmentId) REFERENCES banking.EquityCommitment(EquityCommitmentId) ON DELETE CASCADE,
            CONSTRAINT FK_EquityCommitmentRelatedParty_Partner FOREIGN KEY (RelatedPartyId) REFERENCES core.EquityPartner(EquityPartnerId),
            CONSTRAINT UQ_EquityCommitmentRelatedParty UNIQUE (EquityCommitmentId, RelatedPartyId)
        );
        
        PRINT '   ✓ Created banking.EquityCommitmentRelatedParty table';
    END
    ELSE
    BEGIN
        PRINT '   ✓ banking.EquityCommitmentRelatedParty table already exists';
    END
    PRINT '';
    
    -- ============================================================
    -- 2. ADD INDEXES FOR PERFORMANCE
    -- ============================================================
    PRINT '2. Adding indexes...';
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_EquityCommitmentRelatedParty_EquityCommitmentId'
        AND object_id = OBJECT_ID('banking.EquityCommitmentRelatedParty')
    )
    BEGIN
        CREATE INDEX IX_EquityCommitmentRelatedParty_EquityCommitmentId
        ON banking.EquityCommitmentRelatedParty(EquityCommitmentId);
        PRINT '   ✓ Added index on EquityCommitmentId';
    END
    
    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_EquityCommitmentRelatedParty_RelatedPartyId'
        AND object_id = OBJECT_ID('banking.EquityCommitmentRelatedParty')
    )
    BEGIN
        CREATE INDEX IX_EquityCommitmentRelatedParty_RelatedPartyId
        ON banking.EquityCommitmentRelatedParty(RelatedPartyId);
        PRINT '   ✓ Added index on RelatedPartyId';
    END
    PRINT '';

    PRINT '============================================================';
    PRINT 'Related Parties table created successfully!';
    PRINT '============================================================';
    PRINT '';

END TRY
BEGIN CATCH
    PRINT '❌ ERROR during Related Parties table creation: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO
