-- Inspect Liquidated projects and their participations (PaidOff, ExposureAmount).
-- Run this to verify DB state and see why dashboard may still show non-zero exposure.

SET NOCOUNT ON;

-- 1) All projects with Stage = Liquidated
PRINT '=== Projects with Stage = Liquidated ===';
SELECT pr.ProjectId, pr.ProjectName, pr.Stage
FROM core.Project pr
WHERE LTRIM(RTRIM(ISNULL(pr.Stage, N''))) = N'Liquidated'
ORDER BY pr.ProjectName;

-- 2) Participations for those projects: current PaidOff and ExposureAmount
PRINT '';
PRINT '=== Participations for Liquidated projects (should be PaidOff=1, ExposureAmount=0) ===';
SELECT
  pr.ProjectName,
  pr.Stage,
  b.BankName,
  p.ParticipationId,
  p.LoanId,
  p.PaidOff,
  p.ExposureAmount,
  CASE WHEN p.PaidOff = 1 AND ISNULL(p.ExposureAmount, 0) = 0 THEN 'OK' ELSE 'CHECK' END AS Expected
FROM banking.Participation p
INNER JOIN core.Project pr ON p.ProjectId = pr.ProjectId
LEFT JOIN core.Bank b ON p.BankId = b.BankId
WHERE LTRIM(RTRIM(ISNULL(pr.Stage, N''))) = N'Liquidated'
ORDER BY pr.ProjectName, b.BankName;

-- 3) Any participations still with non-zero exposure for Liquidated projects (should be empty after backfill)
PRINT '';
PRINT '=== Participations on Liquidated projects that still have non-zero exposure (should be 0 rows) ===';
SELECT pr.ProjectName, b.BankName, p.ParticipationId, p.PaidOff, p.ExposureAmount
FROM banking.Participation p
INNER JOIN core.Project pr ON p.ProjectId = pr.ProjectId
LEFT JOIN core.Bank b ON p.BankId = b.BankId
WHERE LTRIM(RTRIM(ISNULL(pr.Stage, N''))) = N'Liquidated'
  AND (ISNULL(p.ExposureAmount, 0) <> 0 OR p.PaidOff <> 1 OR p.PaidOff IS NULL);

-- 4) Participation count per Liquidated project (all should be PaidOff=1, Exposure=0)
PRINT '';
PRINT '=== Participation count per Liquidated project ===';
SELECT
  pr.ProjectName,
  COUNT(*) AS ParticipationCount,
  SUM(CASE WHEN p.PaidOff = 1 AND ISNULL(p.ExposureAmount, 0) = 0 THEN 1 ELSE 0 END) AS OKCount,
  SUM(CASE WHEN p.PaidOff <> 1 OR ISNULL(p.ExposureAmount, 0) <> 0 THEN 1 ELSE 0 END) AS NeedUpdate
FROM banking.Participation p
INNER JOIN core.Project pr ON p.ProjectId = pr.ProjectId
WHERE LTRIM(RTRIM(ISNULL(pr.Stage, N''))) = N'Liquidated'
GROUP BY pr.ProjectName
ORDER BY pr.ProjectName;

-- 5) b1Bank (LA) participations for the four named deals (in case names differ or there are multiple banks)
PRINT '';
PRINT '=== b1Bank participations for The Heights, Dawson Park, Silver Oaks, The Waters at Manhattan ===';
SELECT pr.ProjectName, pr.Stage, b.BankName, p.PaidOff, p.ExposureAmount
FROM banking.Participation p
INNER JOIN core.Project pr ON p.ProjectId = pr.ProjectId
INNER JOIN core.Bank b ON p.BankId = b.BankId
WHERE b.BankName LIKE N'%b1Bank%'
  AND (
    pr.ProjectName LIKE N'%Heights%'
    OR pr.ProjectName LIKE N'%Dawson Park%'
    OR pr.ProjectName LIKE N'%Silver Oaks%'
    OR pr.ProjectName LIKE N'%Manhattan%'
  )
ORDER BY pr.ProjectName;
