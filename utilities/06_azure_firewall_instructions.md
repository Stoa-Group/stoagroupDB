# How to Add Firewall Rule for Domo - Step by Step

## The Problem
You're getting: "User must be in the master database" because you're connected to `stoagroupDB` instead of `master`.

## Solution: Use Azure Portal (RECOMMENDED - Easiest)

This is the **easiest method** and doesn't require SQL access:

1. **Go to Azure Portal:** https://portal.azure.com
2. **Search for your SQL Server:**
   - In the search bar at the top, type: `stoagroupdb`
   - Click on your SQL Server (not the database)
3. **Click "Networking"** in the left menu (or "Firewalls and virtual networks")
4. **Add the firewall rule:**
   - Click **"Add client IP"** button, OR
   - Manually add:
     - **Rule name:** `Domo_Connection`
     - **Start IP address:** `54.208.94.194`
     - **End IP address:** `54.208.94.194`
5. **Click "Save"** at the top
6. **Wait 2-5 minutes** for the change to take effect
7. **Try connecting from Domo again**

---

## Alternative: Use SQL (If you have access)

### Step 1: Create a NEW Connection to Master Database

**In SQL Server Management Studio (SSMS):**
1. Click **"New Query"** or **"Connect"**
2. In the connection dialog:
   - **Server name:** `stoagroupdb.database.windows.net`
   - **Authentication:** SQL Server Authentication
   - **Login:** Your username
   - **Password:** Your password
   - **Database:** **SELECT `master` from the dropdown** ⚠️ THIS IS CRITICAL
3. Click **"Connect"**

**In Azure Data Studio:**
1. Click **"New Connection"**
2. Fill in:
   - **Server:** `stoagroupdb.database.windows.net`
   - **Authentication type:** SQL Login
   - **User name:** Your username
   - **Password:** Your password
   - **Database name:** **Type `master`** ⚠️ THIS IS CRITICAL
3. Click **"Connect"**

### Step 2: Verify You're in Master Database

Run this query to confirm:
```sql
SELECT DB_NAME() AS CurrentDatabase;
```

It should return: `master`

### Step 3: Run the Firewall Rule Command

Once you're confirmed to be in `master`, run:
```sql
EXEC sp_set_firewall_rule 
    @name = N'Domo_IP_1',
    @start_ip_address = '54.208.94.194',
    @end_ip_address = '54.208.94.194';
```

### Step 4: Verify It Worked

```sql
SELECT 
    name,
    start_ip_address,
    end_ip_address,
    create_date
FROM sys.firewall_rules
WHERE name = 'Domo_IP_1';
```

You should see the rule listed.

---

## Why This Is Happening

- Azure SQL Database **does NOT support** the `USE` statement to switch databases
- You must **connect directly** to the database you want to use
- Firewall rules are stored in the `master` database, so you must connect to `master`
- If you're connected to `stoagroupDB`, you cannot access firewall rules

---

## Quick Checklist

- [ ] I'm connected to `master` database (not `stoagroupDB`)
- [ ] I verified with `SELECT DB_NAME()` that I'm in master
- [ ] I ran the `sp_set_firewall_rule` command
- [ ] I verified the rule was created
- [ ] I waited 2-5 minutes
- [ ] I tried connecting from Domo again

---

## Still Having Issues?

**Use Azure Portal instead** - it's much easier and doesn't require SQL access to master database.

