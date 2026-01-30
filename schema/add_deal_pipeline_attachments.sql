-- Add pipeline.DealPipelineAttachment table for file attachments on deals
-- Run on existing DBs that already have pipeline.DealPipeline

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DealPipelineAttachment' AND schema_id = SCHEMA_ID('pipeline'))
BEGIN
    CREATE TABLE pipeline.DealPipelineAttachment (
        DealPipelineAttachmentId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DealPipelineAttachment PRIMARY KEY,
        DealPipelineId INT NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        StoragePath NVARCHAR(1000) NOT NULL,
        ContentType NVARCHAR(100) NULL,
        FileSizeBytes BIGINT NULL,
        CreatedAt DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_DPA_DealPipeline FOREIGN KEY (DealPipelineId) REFERENCES pipeline.DealPipeline(DealPipelineId) ON DELETE CASCADE
    );
    CREATE INDEX IX_DealPipelineAttachment_DealPipelineId ON pipeline.DealPipelineAttachment(DealPipelineId);
    PRINT 'Deal pipeline attachments table created.';
END
ELSE
    PRINT 'pipeline.DealPipelineAttachment already exists.';
