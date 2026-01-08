-- ============================================================
-- AZURE SQL DATABASE FIREWALL SETUP FOR DOMO
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

-- Add Domo's IP address (from error: 54.208.94.194)
EXEC sp_set_firewall_rule 
    @name = N'Domo_IP_1',
    @start_ip_address = '54.208.94.194',
    @end_ip_address = '54.208.94.194';
GO

-- View all firewall rules to confirm it was added
SELECT 
    name,
    start_ip_address,
    end_ip_address,
    create_date
FROM sys.firewall_rules
ORDER BY name;
GO

-- ============================================================
-- If you get a different IP address error later, add it like this:
-- ============================================================
-- EXEC sp_set_firewall_rule 
--     @name = N'Domo_IP_2',
--     @start_ip_address = 'NEW_IP_ADDRESS_HERE',
--     @end_ip_address = 'NEW_IP_ADDRESS_HERE';
-- GO

