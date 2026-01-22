# Deal Pipeline Seeding Guide

## Overview

Three SQL scripts are available to seed/reseed the Deal Pipeline data:

1. **`seed_deal_pipeline.sql`** - Creates DealPipeline records for Projects without one
2. **`seed_deal_pipeline_from_existing_data.sql`** - Populates DealPipeline from existing pipeline data
3. **`reseed_deal_pipeline_complete.sql`** - Complete reseed (runs all steps)

## Quick Start

### Option 1: Complete Reseed (Recommended)
Run the complete reseed script that does everything:

```bash
cd api
npm run db:run-migration ../schema/reseed_deal_pipeline_complete.sql
```

This will:
1. Create DealPipeline records for all Projects that don't have one
2. Populate data from `pipeline.UnderContract` (if exists)
3. Populate data from `pipeline.ClosedProperty` (if exists)
4. Recalculate `SqFtPrice` from `LandPrice` and `Acreage`
5. Update `UnitCount` from `core.Project.Units`

### Option 2: Step-by-Step

**Step 1: Create DealPipeline records**
```bash
npm run db:run-migration ../schema/seed_deal_pipeline.sql
```

**Step 2: Populate from existing data**
```bash
npm run db:run-migration ../schema/seed_deal_pipeline_from_existing_data.sql
```

## What Each Script Does

### `seed_deal_pipeline.sql`
- **Purpose**: Creates DealPipeline records for Projects that don't have one
- **What it does**:
  - Checks which Projects don't have DealPipeline records
  - Creates empty DealPipeline records with:
    - `StartDate` = `core.Project.EstimatedConstructionStartDate`
    - `UnitCount` = `core.Project.Units`
    - All other fields = NULL (to be populated later)
- **When to use**: First time setup, or after adding new Projects
- **Safe to run**: Yes (idempotent - won't create duplicates)

### `seed_deal_pipeline_from_existing_data.sql`
- **Purpose**: Populates DealPipeline records with data from existing pipeline tables
- **What it does**:
  - Updates from `pipeline.UnderContract`:
    - Acreage, LandPrice, SqFtPrice
    - ExecutionDate, DueDiligenceDate, ClosingDate
    - PurchasingEntity, Cash, OpportunityZone, ClosingNotes
  - Updates from `pipeline.ClosedProperty`:
    - Acreage, Price (as LandPrice), PricePerSF (as SqFtPrice)
    - Units (as UnitCount), DueDiligenceDate, ClosingDate
    - PurchasingEntity, CashFlag (as Cash)
  - Recalculates `SqFtPrice` = `LandPrice / (Acreage * 43560)`
  - Updates `UnitCount` from `core.Project.Units`
- **When to use**: After creating DealPipeline records, to populate with existing data
- **Safe to run**: Yes (only updates NULL fields, won't overwrite existing data)

### `reseed_deal_pipeline_complete.sql`
- **Purpose**: Complete reseed - does everything in one script
- **What it does**: Runs all steps from both scripts above
- **When to use**: Complete reset/reseed, or first time setup
- **Safe to run**: Yes (idempotent)

## Usage Examples

### First Time Setup

```bash
# 1. Create the table
npm run db:run-migration ../schema/create_deal_pipeline_table.sql

# 2. Seed DealPipeline records
npm run db:run-migration ../schema/reseed_deal_pipeline_complete.sql

# 3. (Optional) Import from Asana
npm run db:import-asana-deal-pipeline
```

### After Adding New Projects

```bash
# Create DealPipeline records for new Projects
npm run db:run-migration ../schema/seed_deal_pipeline.sql
```

### After Rescaffolding Database

```bash
# 1. Rescaffold
npm run db:rescaffold

# 2. Run DealPipeline table creation
npm run db:run-migration ../schema/create_deal_pipeline_table.sql

# 3. Complete reseed
npm run db:run-migration ../schema/reseed_deal_pipeline_complete.sql
```

### Populate from Existing Pipeline Data

If you have data in `pipeline.UnderContract` or `pipeline.ClosedProperty`:

```bash
npm run db:run-migration ../schema/seed_deal_pipeline_from_existing_data.sql
```

## Verification

After running any seeding script, verify the results:

```sql
-- Check how many DealPipeline records exist
SELECT 
    COUNT(*) AS TotalDealPipelineRecords,
    COUNT(DISTINCT ProjectId) AS UniqueProjects
FROM pipeline.DealPipeline;

-- Check data completeness
SELECT 
    COUNT(*) AS TotalRecords,
    SUM(CASE WHEN Bank IS NOT NULL THEN 1 ELSE 0 END) AS WithBank,
    SUM(CASE WHEN StartDate IS NOT NULL THEN 1 ELSE 0 END) AS WithStartDate,
    SUM(CASE WHEN Acreage IS NOT NULL THEN 1 ELSE 0 END) AS WithAcreage,
    SUM(CASE WHEN LandPrice IS NOT NULL THEN 1 ELSE 0 END) AS WithLandPrice,
    SUM(CASE WHEN SqFtPrice IS NOT NULL THEN 1 ELSE 0 END) AS WithSqFtPrice,
    SUM(CASE WHEN ClosingDate IS NOT NULL THEN 1 ELSE 0 END) AS WithClosingDate
FROM pipeline.DealPipeline;

-- View sample records
SELECT TOP 10
    dp.DealPipelineId,
    p.ProjectName,
    p.Stage,
    dp.Bank,
    dp.StartDate,
    dp.Acreage,
    dp.LandPrice,
    dp.SqFtPrice,
    dp.ClosingDate
FROM pipeline.DealPipeline dp
INNER JOIN core.Project p ON dp.ProjectId = p.ProjectId
ORDER BY dp.DealPipelineId;
```

## Notes

- **Idempotent**: All scripts are safe to run multiple times
- **No Data Loss**: Scripts only update NULL fields, won't overwrite existing data
- **Calculations**: `SqFtPrice` is automatically calculated when both `LandPrice` and `Acreage` are present
- **CORE Integration**: `UnitCount` is synced from `core.Project.Units` if not set
- **Asana Import**: After seeding, you can import from Asana to populate additional fields

## Troubleshooting

### Error: "pipeline.DealPipeline table does not exist"
**Solution**: Run `create_deal_pipeline_table.sql` first:
```bash
npm run db:run-migration ../schema/create_deal_pipeline_table.sql
```

### No data populated
**Check**:
1. Do you have data in `pipeline.UnderContract` or `pipeline.ClosedProperty`?
2. Do the `ProjectId` values match?
3. Run verification queries to see what's NULL

### SqFtPrice is NULL
**Solution**: Make sure both `LandPrice` and `Acreage` are set, then run:
```sql
UPDATE pipeline.DealPipeline
SET SqFtPrice = LandPrice / (Acreage * 43560)
WHERE LandPrice IS NOT NULL
  AND Acreage IS NOT NULL
  AND Acreage > 0
  AND SqFtPrice IS NULL;
```

## Next Steps

After seeding:
1. ✅ Verify data with SQL queries above
2. ✅ Import from Asana (optional): `npm run db:import-asana-deal-pipeline`
3. ✅ Update via API as needed
4. ✅ Test frontend dashboard
