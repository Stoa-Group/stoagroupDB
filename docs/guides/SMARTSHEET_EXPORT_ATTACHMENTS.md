# Smartsheet: Export Row–Attachment Mapping to CSV

This guide describes how to download a Smartsheet sheet’s row–attachment mapping into a CSV (row_id, row_number, primary_value, attachment_id, attachment_name).

---

## 1. What the script does

- Connects to Smartsheet with your API token.
- Reads the sheet by **Sheet ID** (e.g. `3002834590427012`).
- For every row, lists row-level attachments via `Attachments.list_row_attachments`.
- Writes a CSV with columns:
  - **row_id** – Smartsheet row ID  
  - **row_number** – Row number in the sheet  
  - **primary_value** – Value of the sheet’s primary column (for readability)  
  - **attachment_id** – Attachment ID (empty if row has no attachments)  
  - **attachment_name** – Attachment file name (empty if none)

Every row appears in the CSV; rows with no attachments have blank `attachment_id` and `attachment_name`.

---

## 2. One-time setup

1. **Python 3**  
   Ensure Python 3 is installed (`python3 --version`). On macOS use `python3` and `pip3`.

2. **Install dependencies** (from repo root):
   ```bash
   pip3 install -r scripts/requirements-smartsheet.txt
   ```
   Or:
   ```bash
   pip3 install smartsheet-python-sdk python-dotenv
   ```

3. **Configure .env at repo root**  
   The script reads from the repo root `.env`:
   - **SMARTSHEET_API** – Your Smartsheet API token (Account → Apps & Integrations → API Access).
   - **SHEET_ID** – Sheet ID (e.g. `3002834590427012`).  
   Use no spaces around `=`:
   ```bash
   SMARTSHEET_API=your_token_here
   SHEET_ID=3002834590427012
   ```

---

## 3. Run the script

From the **repo root**:

```bash
python3 scripts/export_smartsheet_attachments.py
```

Or from `scripts/`:

```bash
cd scripts
python3 export_smartsheet_attachments.py
```

Output: **smartsheet_row_attachments.csv** in the current working directory (repo root if you ran from repo root).

---

## 4. Optional environment overrides

- **SMARTSHEET_OUTPUT_CSV** – Output file path (default: `smartsheet_row_attachments.csv`).
- **SHEET_ID** – Override sheet ID (default: `3002834590427012` if not set in `.env`).

Do not commit `.env` or the CSV if it contains sensitive data.

---

## 5. Use the CSV to attach files to deal pipeline

After you have **smartsheet_row_attachments.csv**, you can run the API script that maps **primary_value** (deal name in Smartsheet) to your deal pipeline and uploads matching local files:

1. Put the CSV at repo root: **smartsheet_row_attachments.csv** (or set **SMARTSHEET_CSV_PATH** to its path).
2. Ensure **data/CAROLINASPIPELINEFILES** and **data/GULFCOASTPIPELINEFILES** contain the files whose names match the CSV **attachment_name** column (exact or contained).
3. From **api/** run:
   ```bash
   npm run db:attach-from-smartsheet-csv
   ```
4. The script fetches deals from the API, matches **primary_value** to **ProjectName**, and for each attachment looks for a local file by name. It uploads to the deal and skips if the deal already has that attachment.

See **api/scripts/attach-pipeline-files-from-smartsheet-csv.ts** for details.
