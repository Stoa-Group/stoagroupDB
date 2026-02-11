-- ============================================================
-- Leasing DashboardSnapshot: single row storing pre-computed
-- dashboard JSON for GET /api/leasing/dashboard (instant serve).
-- Payload is gzip+base64 in app; column holds NVARCHAR(MAX).
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'leasing')
  EXEC('CREATE SCHEMA leasing');

IF NOT EXISTS (SELECT 1 FROM sys.tables t
               JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'leasing' AND t.name = 'DashboardSnapshot')
CREATE TABLE leasing.DashboardSnapshot (
  Id      INT NOT NULL CONSTRAINT PK_leasing_DashboardSnapshot PRIMARY KEY,  -- use 1
  Payload NVARCHAR(MAX) NULL,   -- JSON (or gz:+base64); full API response body
  BuiltAt DATETIME2(0) NOT NULL
);
