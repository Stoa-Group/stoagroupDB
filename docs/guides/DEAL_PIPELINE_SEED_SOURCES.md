# Deal Pipeline Seed Sources

All deal details for the pipeline are seeded from these two Site Tracking worksheets. They are the **canonical source** for deal pipeline data.

## Source files

| Region        | File path (relative to repo root) |
|--------------|------------------------------------|
| Carolinas + East GA | `data/Site Tracking Worksheet - Carolinas + East GA .csv` |
| Gulf Coast    | `data/Site Tracking Worksheet - Gulf Coast.csv` |

## CSV columns (deal details)

Both CSVs use the same logical columns; only the **city** column name differs:

- **Carolinas:** `City`
- **Gulf Coast:** `Place` (mapped to `core.Project.City` when seeding)

| CSV column              | Maps to DB |
|-------------------------|------------|
| Status                  | `core.Project.Stage` |
| Site                    | `core.Project.ProjectName` (unique per deal) |
| City / Place            | `core.Project.City` |
| State                   | `core.Project.State` |
| Metro Area              | Carolinas: not used (Region = "Carolinas"); Gulf: `core.Project.Region` |
| County                  | `pipeline.DealPipeline.County` |
| Zip Code                | `pipeline.DealPipeline.ZipCode` |
| Total Acreage           | `pipeline.DealPipeline.Acreage` |
| MF Acreage              | `pipeline.DealPipeline.MFAcreage` |
| Zoning                  | `pipeline.DealPipeline.Zoning` |
| Zoned?                  | `pipeline.DealPipeline.Zoned` |
| Units                   | `core.Project.Units`, `pipeline.DealPipeline.UnitCount` |
| Price                   | `pipeline.DealPipeline.LandPrice` (parsed); raw in Notes if not parseable |
| Listed / Unlisted       | `pipeline.DealPipeline.ListingStatus` |
| Date Added              | `pipeline.DealPipeline.StartDate` |
| Broker/Referral Source  | `pipeline.DealPipeline.BrokerReferralSource` |
| Rejected Reason         | `pipeline.DealPipeline.RejectedReason` |
| Comments                | `pipeline.DealPipeline.Notes` (with price raw if needed) |

Seeding also sets `pipeline.DealPipeline.SqFtPrice` when LandPrice and Acreage are both present (LandPrice / (Acreage × 43560)).

## How to seed

**Prerequisite:** Site-tracking columns must exist on `pipeline.DealPipeline`. If the DB was created from scratch with `01_create_schema.sql`, they are already there. Otherwise run:

```bash
cd api && npm run db:add-deal-pipeline-site-tracking-columns
```

Then seed from the CSVs:

```bash
cd api

# Carolinas + East GA (sets Region = "Carolinas" for all rows)
npm run db:seed-site-tracking-carolinas

# Gulf Coast (sets Region = Metro Area from CSV)
npm run db:seed-site-tracking-gulf-coast
```

Each script:

1. Reads the CSV and parses Status, Site, City/Place, State, County, Zip, acreages, zoning, units, price, listing status, date added, broker, rejected reason, comments.
2. Upserts `core.Project` (ProjectName = Site, City, State, Region, Units, Stage).
3. Inserts or updates `pipeline.DealPipeline` for that project with Acreage, LandPrice, SqFtPrice, StartDate, UnitCount, Notes, County, ZipCode, MFAcreage, Zoning, Zoned, ListingStatus, BrokerReferralSource, RejectedReason.

## Attaching files to deals

After seeding, you can attach files from the pipeline file folders to the corresponding deals:

- **Carolinas:** `data/CAROLINASPIPELINEFILES` → `npm run db:attach-carolinas-files`
- **Gulf Coast:** `data/GULFCOASTPIPELINEFILES` → `npm run db:attach-gulf-coast-files`

The attach scripts use the **same env as the backend**: they load `api/.env` and use the API’s database config and Azure Blob config (`DB_*`, `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER`). Run from `api/` so `api/.env` is used.

Filename-to-deal mapping is defined in the attach scripts; unmatched files are reported and can be ignored or mapped later.

**Azure Blob (recommended for deploy):** Store the **Azure Storage key** (connection string) in your host’s environment — e.g. in **Render**: Environment → add **`AZURE_STORAGE_CONNECTION_STRING`** (from Azure Portal → Storage Account → Access keys → Connection string) and **`AZURE_STORAGE_CONTAINER`** (e.g. `deal-pipeline-attachments`). Do not put the connection string in code or Git. Then uploads and the attach scripts store files in Azure Blob, so they persist across redeploys. Run attach scripts locally with the same env vars so uploads go to the same container.

**Where files are stored (disk):** Both the API and the attach scripts use **`api/uploads/deal-pipeline/{DealPipelineId}/`** by default (or the directory set by `UPLOAD_DIR`). The download endpoint looks for files there. If you get "File not found on server", the attachment row exists in the DB but the file is missing at that path—e.g. you ran the attach script on one machine and the API on another, or `uploads/` wasn’t deployed (it’s in `.gitignore`). Fix: run the attach script from `api/` on the same machine that runs the API, or set `UPLOAD_DIR` to the same path everywhere and ensure that directory is present (e.g. a persistent volume in production).
