-- Track scheduled covenant reminders so each milestone is sent at most once.
-- BACKEND-GUIDE-UPCOMING-DATES-REMINDERS.md §5.1: one send per (CovenantId, covenant date, daysBefore).

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id = SCHEMA_ID('banking') AND name = 'CovenantReminderSent')
BEGIN
  CREATE TABLE banking.CovenantReminderSent (
    CovenantReminderSentId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CovenantReminderSent PRIMARY KEY,
    CovenantId             INT NOT NULL,
    CovenantDate           DATE NOT NULL,   -- the covenant's date (DSCRTestDate, OccupancyCovenantDate, CovenantDate, etc. as applicable)
    DaysBefore             INT NOT NULL,    -- e.g. 7, 14, 30, 60, 90
    SentAt                 DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_CovenantReminderSent_Covenant FOREIGN KEY (CovenantId) REFERENCES banking.Covenant(CovenantId) ON DELETE CASCADE,
    CONSTRAINT UQ_CovenantReminderSent_Milestone UNIQUE (CovenantId, CovenantDate, DaysBefore)
  );
  CREATE INDEX IX_CovenantReminderSent_Lookup ON banking.CovenantReminderSent (CovenantId, CovenantDate, DaysBefore);
  PRINT 'Created banking.CovenantReminderSent for once-per-milestone reminder tracking.';
END
ELSE
  PRINT 'banking.CovenantReminderSent already exists.';
