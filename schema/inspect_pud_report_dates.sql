-- Most recent ReportDate and summary of report dates in leasing.PortfolioUnitDetails.
-- Run in SSMS or: node scripts/show-pud-report-dates.js

-- 1) Most recent report date
SELECT
  MAX(ReportDate) AS MostRecentReportDate,
  COUNT(*) AS TotalRows
FROM leasing.PortfolioUnitDetails;

-- 2) All distinct report dates (newest first) with row counts
SELECT
  ReportDate,
  COUNT(*) AS Cnt
FROM leasing.PortfolioUnitDetails
GROUP BY ReportDate
ORDER BY ReportDate DESC;

-- 3) Sample of latest rows (Property, UnitNumber, ReportDate)
SELECT TOP 10
  Property,
  UnitNumber,
  ReportDate,
  UnitLeaseStatus
FROM leasing.PortfolioUnitDetails
ORDER BY ReportDate DESC, Property, UnitNumber;
