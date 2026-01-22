-- ============================================================
-- UPDATE/SEED CLOSED PROPERTIES FROM LAND PURCHASE DATA
-- ============================================================
-- Updates existing projects and creates/updates ClosedProperty records
-- with land purchase details
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '============================================================';
PRINT 'UPDATING CLOSED PROPERTIES FROM LAND PURCHASE DATA';
PRINT '============================================================';
PRINT '';

BEGIN TRY
    -- Create temporary table with provided data
    CREATE TABLE #LandData (
        LandClosingDate DATE,
        ProjectName NVARCHAR(255),
        Location NVARCHAR(255),
        Address NVARCHAR(500),
        Acreage DECIMAL(18,4),
        Units INT,
        Price DECIMAL(18,2),
        SqFtPrice DECIMAL(18,2),
        ActOfSaleDate DATE,
        DueDiligenceDate DATE,
        PurchasingEntity NVARCHAR(255),
        CashFlag BIT
    );

    -- Insert provided data (ignoring Status column and empty ProjectNames)
    INSERT INTO #LandData VALUES
    ('2020-03-12', 'Dawson Park', 'Baton Rouge, LA', 'The Lawrence Messina Property -', 5.387, NULL, 3050000.00, NULL, '2020-03-27', '2020-03-12', '', 0),
    ('2020-07-29', 'The Waters at Hammond', 'Northern "Notch" Property', '', 0.5, NULL, 85000.00, NULL, '2020-10-28', '2020-08-29', '', 0),
    ('2020-07-29', 'The Waters at Hammond', 'Hammond, LA', 'Bauerle Road', 24.72, NULL, 0.00, NULL, '2020-10-28', '2020-08-29', '', 0),
    ('2020-10-06', 'The Waters at Manhattan', 'Harvey, LA', 'Fountain Park Development', 15.66, NULL, 3462000.00, NULL, '2020-10-22', '2020-08-23', '', 0),
    ('2021-01-29', 'The Waters at Manhattan', 'Harvey, LA', 'Lot 15-A Kensington Gardens', NULL, NULL, 10000.00, NULL, '2021-01-29', NULL, '', 0),
    ('2021-05-24', 'The Waters at Ransley', 'Pensacola, FL', 'Pine Forest Road', 14.51, NULL, 4998853.00, NULL, '2021-05-24', '2021-02-08', '', 0),
    ('2021-05-27', 'The Waters at Redstone', 'Crestview, FL', 'Redstone Avenue', 7.9, NULL, 1500000.00, NULL, '2021-05-25', '2021-04-25', '', 0),
    ('2021-05-24', 'The Waters at Redstone', 'Crestview, FL', 'Covell Road', 2.01, NULL, 500000.00, NULL, '2021-05-25', '2021-04-25', '', 0),
    ('2021-08-02', 'The Waters at Heritage', 'Gonzales, LA', 'Heritage Crossing', 10.825, NULL, 4704000.00, NULL, '2021-08-02', '2021-07-21', '', 0),
    ('2021-08-26', 'The Flats at East Bay', 'Fairhope, AL', '9376 Twin Beech Rd', 20.19, NULL, 3300000.00, NULL, '2021-08-20', '2021-07-05', '', 0),
    ('2021-12-01', 'The Waters at Millerville', 'Baton Rouge, LA', 'The Greens at Millerville Blvd', 13.068, NULL, 4000000.00, NULL, '2021-12-02', '2021-11-02', '', 0),
    ('2022-04-11', 'The Waters at Crestview', 'Crestview, FL', 'Mirage Ave', 23.4, NULL, 3250000.00, NULL, '2022-04-11', '2022-04-01', '', 0),
    ('2022-05-23', 'The Waters at West Village', 'Scott, LA', 'Apollo Rd', 7.96, NULL, 3000000.00, NULL, '2022-05-23', '2022-03-15', '', 0),
    ('2022-08-12', 'The Waters at Settlers Trace', 'Lafayette, LA', '536 Settlers Trace Blvd', 18.37, NULL, 7000000.00, NULL, '2022-08-12', '2022-04-21', '', 0),
    ('2023-04-30', 'The Waters at Bluebonnet', 'Baton Rouge, LA', 'Bluebonnet Blvd', 14.29, NULL, 6648000.00, NULL, '2023-04-30', '2023-04-30', '', 0),
    ('2023-07-18', 'The Heights at Picardy', 'Baton Rouge, LA', 'Picardy Ave', 6.44, NULL, 6175000.00, NULL, '2023-08-01', '2023-07-21', '', 0),
    ('2022-08-25', 'The Flats at Ransley', 'Pensacola, FL', 'Pine Forest Road', 11.16, NULL, 5104361.00, NULL, '2023-08-25', '2023-06-26', '', 0),
    ('2023-09-15', 'The Waters at Freeport', 'Freeport, FL', '185 Marquis Way', 10, NULL, 3400000.00, NULL, '2023-09-15', '2023-08-25', '', 0),
    ('2023-09-15', 'The Waters at Freeport', 'Freeport, FL', '', 6.35, NULL, 5500000.00, NULL, '2023-09-15', '2023-08-25', '', 0),
    ('2023-10-20', 'N/A', 'Hammond', 'Tract C-1, Bauerle Rd', 1.797, NULL, 450000.00, NULL, '2023-10-20', NULL, '', 0),
    ('2023-12-15', 'The Waters at McGowin', 'Mobile, AL', 'McVay Dr', 9.6, NULL, 4032000.00, NULL, '2023-12-14', '2023-11-15', '', 0),
    ('2024-04-09', 'The Heights at Waterpointe', 'Flowood, MS', 'Waterpointe Commerical', 3.26, NULL, 3700000.00, NULL, '2024-04-09', '2024-03-08', '', 0),
    (NULL, 'The Heights at Materra', 'Baton Rouge, LA', 'McCall Dr', 8, NULL, 5608726.00, NULL, '2024-04-19', '2023-12-14', '', 0),
    ('2024-07-31', 'The Waters at Promenade', 'Marrero, LA', '12.26 Acres, Girod Ave', 12.26, NULL, 4256000.00, NULL, '2024-07-31', '2024-05-30', '', 0),
    ('2024-08-01', 'The Waters at Crosspointe', 'Columbia, SC', '20.62 Cosson St', 20.62, NULL, 5040000.00, NULL, '2024-08-01', '2024-07-18', '', 0),
    ('2025-02-10', 'The Heights at Inverness', 'Birmingham, AL', '45 Inverness Center Parkway', 13, NULL, 6750000.00, 11.92, '2025-02-07', '2024-12-06', 'Bauerle Rd. Land LLC', 0),
    ('2025-05-27', 'The Waters at Conway', 'Gonzales, LA', 'TBD', 20.08, NULL, 5000000.00, NULL, '2025-05-27', '2025-05-02', 'Cash', 1),
    ('2025-10-15', 'The Waters at Covington', 'Covington, LA', '15274 W Ochsner Blvd', 13.73, NULL, 3588473.00, NULL, '2025-10-15', NULL, '', 0),
    ('2025-12-18', 'The Waters at Robinwood', 'Charlotte, NC', '10700 Harrisburg Rd', 26.84, NULL, 4767500.00, NULL, '2025-12-18', '2025-04-28', 'Cash', 1);

    PRINT '📊 VALIDATION: Checking which projects exist...';
    PRINT '';

    -- Parse Location and determine Region
    -- Helper function to parse City and State from Location
    DECLARE @City NVARCHAR(100);
    DECLARE @State NVARCHAR(50);
    DECLARE @Region NVARCHAR(50);
    DECLARE @ProjectName NVARCHAR(255);
    DECLARE @Location NVARCHAR(255);
    DECLARE @Address NVARCHAR(500);
    DECLARE @Acreage DECIMAL(18,4);
    DECLARE @Units INT;
    DECLARE @Price DECIMAL(18,2);
    DECLARE @SqFtPrice DECIMAL(18,2);
    DECLARE @ActOfSaleDate DATE;
    DECLARE @DueDiligenceDate DATE;
    DECLARE @PurchasingEntity NVARCHAR(255);
    DECLARE @CashFlag BIT;
    DECLARE @LandClosingDate DATE;
    DECLARE @ProjectId INT;
    DECLARE @UpdatedCount INT = 0;
    DECLARE @CreatedCount INT = 0;
    DECLARE @NotFoundCount INT = 0;
    DECLARE @SkippedCount INT = 0;

    -- Check which projects exist
    SELECT 
        ld.ProjectName,
        ld.Location,
        CASE WHEN p.ProjectId IS NOT NULL THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END AS Status,
        p.ProjectId,
        p.City AS CurrentCity,
        p.State AS CurrentState,
        p.Region AS CurrentRegion
    FROM #LandData ld
    LEFT JOIN core.Project p ON p.ProjectName = ld.ProjectName
    WHERE ld.ProjectName IS NOT NULL AND ld.ProjectName != 'N/A' AND LTRIM(RTRIM(ld.ProjectName)) != ''
    ORDER BY ld.ProjectName, ld.LandClosingDate;

    PRINT '';
    PRINT '============================================================';
    PRINT 'UPDATING PROJECTS AND CLOSED PROPERTIES';
    PRINT '============================================================';
    PRINT '';

    -- Process each land purchase record
    -- For projects with multiple purchases, use the most recent or most complete record
    DECLARE land_cursor CURSOR FOR
    SELECT 
        ld.LandClosingDate, 
        ld.ProjectName, 
        ld.Location, 
        ld.Address, 
        ld.Acreage, 
        ld.Units, 
        ld.Price, 
        ld.SqFtPrice,
        ld.ActOfSaleDate, 
        ld.DueDiligenceDate, 
        ld.PurchasingEntity, 
        ld.CashFlag
    FROM #LandData ld
    WHERE ld.ProjectName IS NOT NULL AND ld.ProjectName != 'N/A' AND LTRIM(RTRIM(ld.ProjectName)) != ''
    ORDER BY ld.ProjectName, 
             CASE WHEN ld.LandClosingDate IS NULL THEN 1 ELSE 0 END,  -- NULLs last
             ld.LandClosingDate DESC,  -- Most recent first
             CASE WHEN ld.Price IS NULL THEN 1 ELSE 0 END,  -- NULLs last
             ld.Price DESC;  -- Higher price first (more complete data)

    OPEN land_cursor;
    FETCH NEXT FROM land_cursor INTO @LandClosingDate, @ProjectName, @Location, @Address, @Acreage, @Units,
                                     @Price, @SqFtPrice, @ActOfSaleDate, @DueDiligenceDate, @PurchasingEntity, @CashFlag;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Parse Location (City, State format)
        IF CHARINDEX(',', @Location) > 0
        BEGIN
            SET @City = LTRIM(RTRIM(SUBSTRING(@Location, 1, CHARINDEX(',', @Location) - 1)));
            SET @State = LTRIM(RTRIM(SUBSTRING(@Location, CHARINDEX(',', @Location) + 1, LEN(@Location))));
        END
        ELSE
        BEGIN
            -- If no comma, try to extract state abbreviation (2 letters at end)
            SET @City = @Location;
            SET @State = NULL;
        END

        -- Determine Region from State
        SET @Region = CASE 
            WHEN @State IN ('LA', 'MS', 'AL', 'FL', 'TX') THEN 'Gulf Coast'
            WHEN @State IN ('NC', 'SC', 'GA', 'TN') THEN 'Carolinas'
            ELSE NULL
        END;

        -- Find Project
        SELECT @ProjectId = ProjectId 
        FROM core.Project 
        WHERE ProjectName = @ProjectName;

        IF @ProjectId IS NOT NULL
        BEGIN
            -- Update Project (Address, City, State, Region, Units, Acreage)
            UPDATE core.Project
            SET Address = ISNULL(NULLIF(LTRIM(RTRIM(@Address)), ''), Address),
                City = ISNULL(@City, City),
                State = ISNULL(@State, State),
                Region = ISNULL(@Region, Region),
                Units = ISNULL(@Units, Units),
                UpdatedAt = SYSDATETIME()
            WHERE ProjectId = @ProjectId;

            -- Calculate PricePerSF if not provided but Price and Acreage are available
            IF @SqFtPrice IS NULL AND @Price IS NOT NULL AND @Acreage IS NOT NULL AND @Acreage > 0
            BEGIN
                SET @SqFtPrice = @Price / (@Acreage * 43560); -- 43560 sq ft per acre
            END

            -- Update or Insert ClosedProperty
            -- Use MERGE to handle duplicates (only update if this record has more complete data)
            IF EXISTS (SELECT 1 FROM pipeline.ClosedProperty WHERE ProjectId = @ProjectId)
            BEGIN
                -- Only update if this record has more recent date or more complete data
                DECLARE @ShouldUpdate BIT = 0;
                DECLARE @CurrentClosingDate DATE;
                DECLARE @CurrentPrice DECIMAL(18,2);
                
                SELECT @CurrentClosingDate = LandClosingDate, @CurrentPrice = Price
                FROM pipeline.ClosedProperty
                WHERE ProjectId = @ProjectId;
                
                -- Update if: newer date, or same date but higher price (more complete), or current has NULL values
                IF (@LandClosingDate > @CurrentClosingDate) OR 
                   (@LandClosingDate = @CurrentClosingDate AND @Price > ISNULL(@CurrentPrice, 0)) OR
                   (@CurrentClosingDate IS NULL AND @LandClosingDate IS NOT NULL) OR
                   (@CurrentPrice IS NULL AND @Price IS NOT NULL)
                BEGIN
                    SET @ShouldUpdate = 1;
                END
                
                IF @ShouldUpdate = 1
                BEGIN
                    UPDATE pipeline.ClosedProperty
                    SET LandClosingDate = ISNULL(@LandClosingDate, LandClosingDate),
                        Acreage = ISNULL(@Acreage, Acreage),
                        Units = ISNULL(@Units, Units),
                        Price = ISNULL(@Price, Price),
                        PricePerSF = ISNULL(@SqFtPrice, PricePerSF),
                        ActOfSale = ISNULL(CAST(@ActOfSaleDate AS NVARCHAR(255)), ActOfSale),
                        DueDiligenceDate = ISNULL(@DueDiligenceDate, DueDiligenceDate),
                        PurchasingEntity = ISNULL(NULLIF(LTRIM(RTRIM(@PurchasingEntity)), ''), PurchasingEntity),
                        CashFlag = ISNULL(@CashFlag, CashFlag)
                    WHERE ProjectId = @ProjectId;

                    SET @UpdatedCount = @UpdatedCount + 1;
                    PRINT '✅ Updated: ' + @ProjectName + ' (Land Closing: ' + ISNULL(CONVERT(NVARCHAR(10), @LandClosingDate), 'NULL') + ')';
                END
                ELSE
                BEGIN
                    SET @SkippedCount = @SkippedCount + 1;
                    PRINT '⏭️  Skipped (existing record more complete): ' + @ProjectName;
                END
            END
            ELSE
            BEGIN
                INSERT INTO pipeline.ClosedProperty (
                    ProjectId, LandClosingDate, Acreage, Units, Price, PricePerSF,
                    ActOfSale, DueDiligenceDate, PurchasingEntity, CashFlag
                )
                VALUES (
                    @ProjectId, @LandClosingDate, @Acreage, @Units, @Price, @SqFtPrice,
                    CAST(@ActOfSaleDate AS NVARCHAR(255)), @DueDiligenceDate,
                    NULLIF(LTRIM(RTRIM(@PurchasingEntity)), ''), @CashFlag
                );

                SET @CreatedCount = @CreatedCount + 1;
                PRINT '✅ Created ClosedProperty for: ' + @ProjectName + ' (Land Closing: ' + ISNULL(CONVERT(NVARCHAR(10), @LandClosingDate), 'NULL') + ')';
            END
        END
        ELSE
        BEGIN
            SET @NotFoundCount = @NotFoundCount + 1;
            PRINT '❌ NOT FOUND: ' + @ProjectName;
        END

        FETCH NEXT FROM land_cursor INTO @LandClosingDate, @ProjectName, @Location, @Address, @Acreage, @Units,
                                         @Price, @SqFtPrice, @ActOfSaleDate, @DueDiligenceDate, @PurchasingEntity, @CashFlag;
    END

    CLOSE land_cursor;
    DEALLOCATE land_cursor;

    DROP TABLE #LandData;

    PRINT '';
    PRINT '============================================================';
    PRINT 'UPDATE SUMMARY';
    PRINT '============================================================';
    PRINT '   - ClosedProperty records updated: ' + CAST(@UpdatedCount AS NVARCHAR(10));
    PRINT '   - ClosedProperty records created: ' + CAST(@CreatedCount AS NVARCHAR(10));
    PRINT '   - Records skipped (existing more complete): ' + CAST(@SkippedCount AS NVARCHAR(10));
    PRINT '   - Projects not found: ' + CAST(@NotFoundCount AS NVARCHAR(10));
    PRINT '';
    PRINT '✅ Update completed!';
    PRINT '============================================================';

END TRY
BEGIN CATCH
    IF CURSOR_STATUS('global', 'land_cursor') >= 0
    BEGIN
        CLOSE land_cursor;
        DEALLOCATE land_cursor;
    END
    
    IF OBJECT_ID('tempdb..#LandData') IS NOT NULL
        DROP TABLE #LandData;

    PRINT '❌ ERROR:';
    PRINT '   ' + ERROR_MESSAGE();
    PRINT '   Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
    PRINT '   Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
    THROW;
END CATCH
GO

-- Verification: Show updated ClosedProperty records
PRINT '';
PRINT 'VERIFICATION: Updated ClosedProperty records';
SELECT 
    p.ProjectName,
    p.City,
    p.State,
    p.Region,
    p.Address,
    cp.LandClosingDate AS ClosingDate,
    cp.Acreage,
    cp.Units,
    cp.Price,
    cp.PricePerSF,
    cp.ActOfSale,
    cp.DueDiligenceDate,
    cp.PurchasingEntity,
    cp.CashFlag
FROM pipeline.ClosedProperty cp
INNER JOIN core.Project p ON cp.ProjectId = p.ProjectId
WHERE p.ProjectName IN (
    SELECT DISTINCT ProjectName 
    FROM (VALUES
        ('Dawson Park'), ('The Waters at Hammond'), ('The Waters at Manhattan'),
        ('The Waters at Ransley'), ('The Waters at Redstone'), ('The Waters at Heritage'),
        ('The Flats at East Bay'), ('The Waters at Millerville'), ('The Waters at Crestview'),
        ('The Waters at West Village'), ('The Waters at Settlers Trace'), ('The Waters at Bluebonnet'),
        ('The Heights at Picardy'), ('The Flats at Ransley'), ('The Waters at Freeport'),
        ('The Waters at McGowin'), ('The Heights at Waterpointe'), ('The Heights at Materra'),
        ('The Waters at Promenade'), ('The Waters at Crosspointe'), ('The Heights at Inverness'),
        ('The Waters at Conway'), ('The Waters at Covington'), ('The Waters at Robinwood')
    ) AS Projects(ProjectName)
)
ORDER BY cp.LandClosingDate DESC, p.ProjectName;
GO
