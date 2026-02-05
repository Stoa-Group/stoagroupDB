-- Boss Morning Feedback: Lead bank flag on participations.
-- BACKEND-GUIDE-BOSS-MORNING-FEEDBACK.md §12

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('banking.Participation') AND name = 'IsLead')
BEGIN
  ALTER TABLE banking.Participation ADD IsLead BIT NULL DEFAULT 0;
  PRINT 'Added IsLead to banking.Participation';
END
ELSE
  PRINT 'IsLead already exists on banking.Participation';
