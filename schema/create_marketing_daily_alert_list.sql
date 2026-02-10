-- Marketing: Daily Alert Email List
-- Recipients can be selected from core.Person (core contacts) or added ad-hoc (email + optional name).
-- Used for daily marketing/review alerts.

SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'marketing')
  EXEC('CREATE SCHEMA marketing');

IF NOT EXISTS (SELECT 1 FROM sys.tables t
               JOIN sys.schemas s ON s.schema_id = t.schema_id
               WHERE s.name = 'marketing' AND t.name = 'DailyAlertRecipient')
BEGIN
  CREATE TABLE marketing.DailyAlertRecipient (
    Id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DailyAlertRecipient PRIMARY KEY,
    PersonId    INT NULL,
    Email       NVARCHAR(255) NOT NULL,
    DisplayName NVARCHAR(255) NULL,
    SortOrder   INT NULL,
    CreatedAt   DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_DailyAlertRecipient_Person FOREIGN KEY (PersonId) REFERENCES core.Person(PersonId),
    CONSTRAINT UQ_DailyAlertRecipient_Email UNIQUE (Email)
  );

  CREATE INDEX IX_DailyAlertRecipient_PersonId ON marketing.DailyAlertRecipient(PersonId);
  PRINT 'Created marketing.DailyAlertRecipient';
END
ELSE
  PRINT 'marketing.DailyAlertRecipient already exists.';
