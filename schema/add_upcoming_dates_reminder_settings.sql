-- Global reminder settings for Key dates & covenants (Upcoming Dates).
-- BACKEND-GUIDE-UPCOMING-DATES-REMINDERS.md: one row per setting key, value as JSON.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AppSettings' AND schema_id = SCHEMA_ID('banking'))
BEGIN
  CREATE TABLE banking.AppSettings (
    SettingKey   NVARCHAR(100) NOT NULL CONSTRAINT PK_AppSettings PRIMARY KEY,
    SettingValue NVARCHAR(MAX) NULL,
    UpdatedAt    DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
  );
  PRINT 'Created banking.AppSettings';
END
ELSE
  PRINT 'banking.AppSettings already exists';
