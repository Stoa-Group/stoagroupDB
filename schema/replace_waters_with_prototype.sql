-- ============================================================
-- REPLACE "Waters" PRODUCT TYPE WITH "Prototype"
-- Updates all references from "Waters" to "Prototype"
-- ============================================================

SET NOCOUNT ON;

PRINT '============================================================';
PRINT 'Replacing "Waters" product type with "Prototype"';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. UPDATE ProductType TABLE
-- ============================================================
PRINT '1. Updating core.ProductType table...';

-- Update the ProductTypeName from "Waters" to "Prototype"
IF EXISTS (SELECT 1 FROM core.ProductType WHERE ProductTypeName = 'Waters')
BEGIN
    UPDATE core.ProductType
    SET ProductTypeName = 'Prototype',
        UpdatedAt = SYSDATETIME()
    WHERE ProductTypeName = 'Waters';
    
    PRINT '   ✓ Updated ProductType "Waters" to "Prototype"';
END
ELSE IF EXISTS (SELECT 1 FROM core.ProductType WHERE ProductTypeName = 'Prototype')
BEGIN
    PRINT '   ✓ ProductType "Prototype" already exists';
END
ELSE
BEGIN
    -- If neither exists, add Prototype
    INSERT INTO core.ProductType (ProductTypeName, DisplayOrder)
    VALUES ('Prototype', 2);
    PRINT '   ✓ Added ProductType "Prototype"';
END
GO

-- ============================================================
-- 2. UPDATE ALL PROJECTS WITH "Waters" PRODUCT TYPE
-- ============================================================
PRINT '';
PRINT '2. Updating projects with "Waters" product type...';

DECLARE @UpdatedProjects INT;

UPDATE core.Project
SET ProductType = 'Prototype',
    UpdatedAt = SYSDATETIME()
WHERE ProductType = 'Waters';

SET @UpdatedProjects = @@ROWCOUNT;

IF @UpdatedProjects > 0
BEGIN
    PRINT '   ✓ Updated ' + CAST(@UpdatedProjects AS VARCHAR(10)) + ' project(s) from "Waters" to "Prototype"';
END
ELSE
BEGIN
    PRINT '   ✓ No projects found with "Waters" product type';
END
GO

-- ============================================================
-- 3. VERIFY CHANGES
-- ============================================================
PRINT '';
PRINT '3. Verifying changes...';

DECLARE @WatersCount INT;
DECLARE @PrototypeCount INT;

SELECT @WatersCount = COUNT(*) FROM core.ProductType WHERE ProductTypeName = 'Waters';
SELECT @PrototypeCount = COUNT(*) FROM core.ProductType WHERE ProductTypeName = 'Prototype';

SELECT @WatersCount = COUNT(*) FROM core.Project WHERE ProductType = 'Waters';
SELECT @PrototypeCount = COUNT(*) FROM core.Project WHERE ProductType = 'Prototype';

IF @WatersCount = 0 AND @PrototypeCount > 0
BEGIN
    PRINT '   ✓ SUCCESS: All "Waters" references replaced with "Prototype"';
    PRINT '   ✓ Found ' + CAST(@PrototypeCount AS VARCHAR(10)) + ' project(s) with "Prototype" product type';
END
ELSE IF @WatersCount > 0
BEGIN
    PRINT '   ⚠ WARNING: ' + CAST(@WatersCount AS VARCHAR(10)) + ' "Waters" reference(s) still exist';
END
ELSE
BEGIN
    PRINT '   ✓ No "Waters" references found (already replaced)';
END
GO

PRINT '';
PRINT '============================================================';
PRINT 'Product type replacement completed!';
PRINT '============================================================';
PRINT '';
PRINT 'All "Waters" product types have been replaced with "Prototype"';
PRINT '';
