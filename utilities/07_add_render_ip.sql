-- ============================================================
-- ADD RENDER IP ADDRESS TO AZURE SQL DATABASE FIREWALL
-- ============================================================
-- CRITICAL: You MUST connect directly to the MASTER database
-- 
-- Connection Settings:
--   Server: stoagroupdb.database.windows.net
--   Database: master  <-- SELECT THIS SPECIFICALLY
--   Authentication: SQL Server Authentication
--
-- Azure SQL Database does NOT support USE statement
-- You cannot switch databases - you must connect to master directly
-- ============================================================

-- Add Render's IP address (4.220.49.253)
EXEC sp_set_firewall_rule 
    @name = N'Render_API_IP',
    @start_ip_address = '4.220.49.253',
    @end_ip_address = '4.220.49.253';
GO

-- View all firewall rules to confirm it was added
SELECT 
    name,
    start_ip_address,
    end_ip_address,
    create_date
FROM sys.firewall_rules
WHERE name LIKE '%Render%' OR name LIKE '%API%'
ORDER BY name;
GO

-- ============================================================
-- ALTERNATIVE: Use Azure Portal (EASIER - RECOMMENDED)
-- ============================================================
-- 1. Go to https://portal.azure.com
-- 2. Search for "stoagroupdb" (your SQL Server)
-- 3. Click on your SQL Server (not the database)
-- 4. Click "Networking" in the left menu
-- 5. Click "Add client IP" or manually add:
--    - Rule name: Render_API_IP
--    - Start IP: 4.220.49.253
--    - End IP: 4.220.49.253
-- 6. Click "Save"
-- 7. Wait 2-5 minutes for changes to take effect
-- ============================================================
