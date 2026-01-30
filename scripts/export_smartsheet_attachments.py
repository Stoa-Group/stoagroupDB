#!/usr/bin/env python3
"""
Export Smartsheet row–attachment mapping to CSV.

Reads SMARTSHEET_API and SHEET_ID from the repo root .env (or environment).
Writes a CSV with columns: row_id, row_number, primary_value, attachment_id, attachment_name.
Every row appears; rows with no attachments have empty attachment_id and attachment_name.

Setup:
  pip3 install smartsheet-python-sdk python-dotenv
  (or: pip install -r scripts/requirements-smartsheet.txt)

Run from repo root:
  python3 scripts/export_smartsheet_attachments.py

Or from scripts/:
  python3 export_smartsheet_attachments.py

Output: smartsheet_row_attachments.csv (in current working directory).
"""

import csv
import os
import sys

# Load .env from repo root (parent of scripts/)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(_SCRIPT_DIR)
_ENV_PATH = os.path.join(_REPO_ROOT, ".env")

try:
    from dotenv import load_dotenv
    load_dotenv(_ENV_PATH)
except ImportError:
    pass  # optional: run without python-dotenv if vars are already in env

import smartsheet

# From env; fallback for SHEET_ID only (do not hardcode API token)
API_TOKEN = os.environ.get("SMARTSHEET_API", "").strip()
SHEET_ID = os.environ.get("SHEET_ID", "").strip() or "3002834590427012"
OUTPUT_FILE = os.environ.get("SMARTSHEET_OUTPUT_CSV", "smartsheet_row_attachments.csv")


def main():
    if not API_TOKEN:
        print("Error: Set SMARTSHEET_API in .env or environment (repo root .env is loaded).", file=sys.stderr)
        sys.exit(1)

    sheet_id = int(SHEET_ID)
    smartsheet_client = smartsheet.Smartsheet(API_TOKEN)
    smartsheet_client.errors_as_exceptions(True)

    print(f"Fetching sheet {sheet_id} ...")
    sheet = smartsheet_client.Sheets.get_sheet(sheet_id)

    primary_col_id = None
    for col in sheet.columns:
        if col.primary:
            primary_col_id = col.id
            break

    with open(OUTPUT_FILE, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "row_id",
            "row_number",
            "primary_value",
            "attachment_id",
            "attachment_name"
        ])

        for row in sheet.rows:
            primary_value = ""
            if primary_col_id is not None:
                for cell in row.cells:
                    if cell.column_id == primary_col_id:
                        primary_value = cell.value or ""
                        break

            attachments_result = smartsheet_client.Attachments.list_row_attachments(
                sheet_id,
                row.id,
                include_all=True
            )
            attachments = attachments_result.data if attachments_result else []

            if attachments:
                for att in attachments:
                    writer.writerow([
                        row.id,
                        row.row_number,
                        primary_value,
                        att.id,
                        att.name
                    ])
            else:
                writer.writerow([
                    row.id,
                    row.row_number,
                    primary_value,
                    "",
                    ""
                ])

    print(f"Done. CSV written to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
