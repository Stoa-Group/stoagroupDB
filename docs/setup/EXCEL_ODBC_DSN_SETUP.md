# Excel → Azure SQL: ODBC DSN Setup (OpenLink SQL Server Lite)

Use this when setting up the **OpenLink SQL Server Lite** wizard so Excel can connect to the stoagroupDB Azure SQL database.

Get the actual values from your project `.env` (in repo root or `api/`). The variable names used here match `api/src/config/database.ts`.

---

## 1. DSN tab (first screen)

- **DSN:** Any friendly name, e.g. `STOAGroupDB` or `stoagroupDB_Excel`.
- **Description:** Optional, e.g. `Azure SQL – stoagroupDB for Excel`.

Click **Continue**.

---

## 2. Connection tab

Fill in using your `.env` values:

| Field | .env variable | Example (yours may differ) |
|-------|----------------|----------------------------|
| **Server / Host** | `DB_SERVER` | `stoagroupdb.database.windows.net` |
| **Database** | `DB_DATABASE` | `stoagroupDB` |
| **Username** | `DB_USER` | (your DB user) |
| **Password** | `DB_PASSWORD` | (your DB password) |

- **Port:** Usually leave default (1433 for SQL Server) unless you use a custom port.
- If there is an **Encrypt** or **Use encryption** option, set it to match `DB_ENCRYPT` (typically **Yes** for Azure SQL).

Click **Continue** (or **Next**).

---

## 3. Options / Preferences / Compatibility

- Keep defaults unless you have special requirements.
- For Azure SQL, **Encrypt** should be enabled (matches `DB_ENCRYPT=true`).

---

## 4. Test tab

- Use **Test** or **Test connection** to verify.
- If it fails: double-check server name, database name, username, password, and that your IP is allowed in Azure (firewall rules).

---

## 5. Finish

- Click **OK** to save the DSN.

Then in Excel: **Data → Get Data → From Database → From SQL Server** (or “From ODBC”) and choose the DSN you created. Use the same server/database/user/password if the wizard asks instead of the DSN.

---

## Quick reference (from your config)

- **Server:** `DB_SERVER` (e.g. `stoagroupdb.database.windows.net`)
- **Database:** `DB_DATABASE` (e.g. `stoagroupDB`)
- **User:** `DB_USER`
- **Password:** `DB_PASSWORD`
- **Encrypt:** use when `DB_ENCRYPT=true` (normal for Azure SQL)

Do not commit `.env` or paste real passwords into docs or chat.
