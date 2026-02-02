-- ============================================================
-- Broker/Referral Contact table + Deal Pipeline fields
-- (Land Development Pipeline: contact lookup + PriceRaw)
-- ============================================================

SET NOCOUNT ON;

-- 1. Create BrokerReferralContact table if not exists
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BrokerReferralContact' AND schema_id = SCHEMA_ID('pipeline'))
BEGIN
    CREATE TABLE pipeline.BrokerReferralContact (
        BrokerReferralContactId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BrokerReferralContact PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(100) NULL,
        CreatedAt DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        ModifiedAt DATETIME2(0) NULL
    );
    PRINT 'Created pipeline.BrokerReferralContact table';
END
ELSE
    PRINT 'pipeline.BrokerReferralContact table already exists';
GO

-- 2. Add BrokerReferralContactId to DealPipeline if not exists
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pipeline' AND TABLE_NAME = 'DealPipeline' AND COLUMN_NAME = 'BrokerReferralContactId')
BEGIN
    ALTER TABLE pipeline.DealPipeline ADD BrokerReferralContactId INT NULL;
    PRINT 'Added DealPipeline.BrokerReferralContactId';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_DP_BrokerReferralContact')
BEGIN
    ALTER TABLE pipeline.DealPipeline
    ADD CONSTRAINT FK_DP_BrokerReferralContact
    FOREIGN KEY (BrokerReferralContactId) REFERENCES pipeline.BrokerReferralContact(BrokerReferralContactId);
    PRINT 'Added FK_DP_BrokerReferralContact';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DealPipeline_BrokerReferralContactId' AND object_id = OBJECT_ID('pipeline.DealPipeline'))
BEGIN
    CREATE INDEX IX_DealPipeline_BrokerReferralContactId ON pipeline.DealPipeline(BrokerReferralContactId);
    PRINT 'Created IX_DealPipeline_BrokerReferralContactId';
END
GO

-- 3. Add PriceRaw to DealPipeline if not exists
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pipeline' AND TABLE_NAME = 'DealPipeline' AND COLUMN_NAME = 'PriceRaw')
BEGIN
    ALTER TABLE pipeline.DealPipeline ADD PriceRaw NVARCHAR(100) NULL;
    PRINT 'Added DealPipeline.PriceRaw';
END
GO

PRINT 'Broker/Referral contact and deal pipeline fields done.';
