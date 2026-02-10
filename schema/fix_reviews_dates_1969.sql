-- ============================================================
-- Fix reviews.Review dates: remove Dec 31, 1969 (epoch) and
-- set review_date from review_year/review_month (15th of month)
-- when no exact date was stored (e.g. "X months ago" data).
-- ============================================================
SET NOCOUNT ON;

-- 1) Set review_date to the 15th of review_year/review_month where we have year+month
--    and current review_date is either 1969-12-31 or NULL.
UPDATE reviews.Review
SET review_date = DATEFROMPARTS(review_year, review_month, 15)
WHERE review_year IS NOT NULL
  AND review_month IS NOT NULL
  AND review_month BETWEEN 1 AND 12
  AND review_year BETWEEN 1900 AND 2100
  AND (review_date = '1969-12-31' OR review_date IS NULL);

PRINT 'Updated review_date to 15th of month where year+month present.';

-- 2) Clear any remaining 1969-12-31 so we never display epoch as a real date.
UPDATE reviews.Review
SET review_date = NULL
WHERE review_date = '1969-12-31';

PRINT 'Cleared remaining 1969-12-31 review_date.';
GO
