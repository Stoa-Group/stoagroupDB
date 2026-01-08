# Setup Instructions for Database Scripts

## ⚠️ Important: Install Dependencies First!

Before running the database scripts, you **must** install dependencies:

```bash
cd api
npm install
```

This installs:
- `mssql` - SQL Server driver
- `ts-node` - TypeScript execution
- `@types/node` - Node.js type definitions
- All other required packages

---

## After Installation

Once dependencies are installed, you can use:

```bash
# Test connection
npm run db:test

# Query data
npm run db:query "SELECT * FROM core.Project"

# Execute commands
npm run db:exec "UPDATE core.Project SET Units = 250 WHERE ProjectId = 1"
```

---

## If You See TypeScript Errors

If you get errors like "Cannot find module 'mssql'" or "Cannot find name 'console'", it means:

1. **Dependencies aren't installed** - Run `npm install` in the `api/` folder
2. **Check your `.env` file** - Make sure it has database credentials

---

## Quick Fix

```bash
cd api
npm install
npm run db:test
```

That's it! The scripts will automatically read from your `.env` file.
