-- Cleanup unused / legacy database objects
-- Run when you want to remove obsolete tables, views, or other objects that are no longer used by the API.
-- Log any run in docs/DB_CHANGELOG.md.

SET NOCOUNT ON;

PRINT '=== Cleanup unused objects ===';

-- ---------------------------------------------------------------------------
-- 1. pipeline.LandDevelopmentContact (legacy)
-- Replaced by core.Person + pipeline.LandDevelopmentContactExtension.
-- The API uses only Person + extension; this standalone table is unused.
-- ---------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LandDevelopmentContact' AND schema_id = SCHEMA_ID('pipeline'))
BEGIN
  DROP TABLE pipeline.LandDevelopmentContact;
  PRINT 'Dropped: pipeline.LandDevelopmentContact (replaced by core.Person + LandDevelopmentContactExtension)';
END
ELSE
  PRINT 'Skip: pipeline.LandDevelopmentContact does not exist';

-- ---------------------------------------------------------------------------
-- 2. (Add more obsolete objects here as we retire them. Example:)
-- IF EXISTS (SELECT 1 FROM sys.views WHERE name = 'OldView' AND schema_id = SCHEMA_ID('dbo'))
-- BEGIN
--   DROP VIEW dbo.OldView;
--   PRINT 'Dropped: dbo.OldView';
-- END
-- ---------------------------------------------------------------------------

PRINT '=== Cleanup complete ===';
