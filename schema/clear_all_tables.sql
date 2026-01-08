-- ============================================================
-- DROP ALL TABLES (Start from Scratch)
-- Removes all tables, views, and constraints from the database
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRAN;

    -- Step 1: Drop all foreign key constraints
    DECLARE @sql NVARCHAR(MAX) = N'';
    
    SELECT @sql += N'
    ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + 
    QUOTENAME(OBJECT_NAME(parent_object_id)) + 
    ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
    FROM sys.foreign_keys;
    
    IF @sql <> N''
    BEGIN
        EXEC sys.sp_executesql @sql;
        PRINT 'Dropped all foreign key constraints.';
    END

    -- Step 2: Drop all views
    DECLARE @viewSql NVARCHAR(MAX) = N'';
    
    SELECT @viewSql += N'DROP VIEW ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ';'
    FROM sys.views
    WHERE SCHEMA_NAME(schema_id) IN ('core', 'banking', 'equity', 'pipeline', 'stage', 'land', 'dbo');
    
    IF @viewSql <> N''
    BEGIN
        EXEC sys.sp_executesql @viewSql;
        PRINT 'Dropped all views.';
    END

    -- Step 3: Drop all tables (dynamic - catches everything)
    DECLARE @tableSql NVARCHAR(MAX) = N'';
    
    SELECT @tableSql += N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ';'
    FROM sys.tables
    WHERE SCHEMA_NAME(schema_id) IN ('core', 'banking', 'equity', 'pipeline', 'stage', 'land', 'dbo')
      AND name NOT LIKE 'sys%'
      AND name NOT LIKE 'MS_%';
    
    IF @tableSql <> N''
    BEGIN
        EXEC sys.sp_executesql @tableSql;
        PRINT 'Dropped all tables.';
    END

    COMMIT;

    PRINT 'Database cleared - ready to start from scratch.';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT 'Error: ' + ERROR_MESSAGE();
    PRINT 'Line: ' + CAST(ERROR_LINE() AS VARCHAR(10));
    THROW;
END CATCH;

