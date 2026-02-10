-- ============================================================
-- Seed Google Maps URLs into reviews.PropertyReviewConfig
-- for each property (matches core.Project by ProjectName).
-- Used by the Stoa Google auto-scraper when it fetches from API.
-- Run after create_reviews_tables.sql and when core.Project is populated.
-- ============================================================

SET NOCOUNT ON;

-- The Waters at Hammond
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Hammond/@30.4877489,-90.465321,17z/data=!4m8!3m7!1s0x862723fbcc2afb85:0x188d3eeca51192d0!8m2!3d30.4877443!4d-90.4627461!9m1!1b1!16s%2Fg%2F11rsqw95lz?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Hammond') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Flats at East Bay
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Flats+at+East+Bay/@30.5014556,-87.8652493,17z/data=!4m8!3m7!1s0x889a3f60ad1dd52d:0x332da4c4b0b0c51e!8m2!3d30.5014556!4d-87.8626744!9m1!1b1!16s%2Fg%2F11kphm6rdl?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Flats at East Bay') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Heights at Picardy
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Heights+at+Picardy/@30.394175,-91.1028869,17z/data=!4m8!3m7!1s0x8626a56f7f0dc5bf:0xb38345b83bdc892b!8m2!3d30.3941704!4d-91.100312!9m1!1b1!16s%2Fg%2F11wc3yhv50?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Heights at Picardy') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at Bluebonnet
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Bluebonnet/@30.4147288,-91.0766963,17z/data=!4m8!3m7!1s0x8626a53bc0c94fbf:0x84b7af1708cc8d8d!8m2!3d30.4147242!4d-91.0741214!9m1!1b1!16s%2Fg%2F11vhqlgm6w?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Bluebonnet') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at Crestview
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Crestview/@30.72914,-86.5837232,16z/data=!4m12!1m2!2m1!1sThe+Waters+at+Crestview!3m8!1s0x8891732640bd5b21:0x1f92c28a5bf11ed2!8m2!3d30.72914!4d-86.574196!9m1!1b1!15sChdUaGUgV2F0ZXJzIGF0IENyZXN0dmlld5IBEWFwYXJ0bWVudF9jb21wbGV4qgFPCg0vZy8xMXdqOWIxd19sEAEyHxABIhtz0Zy4AByGfqcuDOZ1uEsX5sFCaoT55uVWfksyGxACIhd0aGUgd2F0ZXJzIGF0IGNyZXN0dmlld-ABAA!16s%2Fg%2F11wj9b1w_l?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Crestview') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at Millerville
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Millerville/@30.439755,-91.0289876,17z/data=!4m8!3m7!1s0x8626bd7f2db7ca89:0x1d15edca3d614c78!8m2!3d30.4397504!4d-91.0264127!9m1!1b1!16s%2Fg%2F11sdm7v6s3?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Millerville') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at Redstone
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Redstone/@30.7362907,-86.5595057,17z/data=!4m8!3m7!1s0x8891731ed5ef4421:0xe82971b01b043e0e!8m2!3d30.7362861!4d-86.5569308!9m1!1b1!16s%2Fg%2F11sdm7w83h?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Redstone') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at Settlers Trace
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Settlers+Trace/@30.162335,-92.0533341,17z/data=!4m8!3m7!1s0x86249d93f2c9161f:0xde2de5332356386d!8m2!3d30.1623304!4d-92.0507592!9m1!1b1!16s%2Fg%2F11vb312kvw?entry=ttu&g_ep=EgoyMDI1MDgxMC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Settlers Trace') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at West Village
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+West+Village/@30.2214016,-92.097974,1093m/data=!3m1!1e3!4m8!3m7!1s0x86249fc349920de9:0x7945e14be23642b4!8m2!3d30.2214016!4d-92.0953991!9m1!1b1!16s%2Fg%2F11vdd4crjw?entry=ttu&g_ep=EgoyMDI1MTAyMi4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at West Village') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at McGowin
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+McGowin/@30.6516886,-88.1154892,17z/data=!4m8!3m7!1s0x889a4db406a47bd1:0xa0adc97698cb8809!8m2!3d30.6516886!4d-88.1129143!9m1!1b1!16s%2Fg%2F11wqc9tntx?entry=ttu&g_ep=EgoyMDI1MTAwOC4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at McGowin') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at Freeport (Maps Lite reviews URL - opens place with reviews tab)
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Freeport/@30.486358,-86.126171,17z/data=!4m8!3m7!1s0x8893dda15e2f9069:0x3177e609fc299d13!8m2!3d30.486358!4d-86.126171!9m1!1b1!16s%2Fg%2F11x6xcg0gq?entry=ttu&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Freeport') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

-- The Waters at Promenade
MERGE reviews.PropertyReviewConfig AS t
USING (SELECT p.ProjectId, N'https://www.google.com/maps/place/The+Waters+at+Promenade/@29.8762177,-90.0988489,17z/data=!4m8!3m7!1s0x8620a30078b1969b:0x1d8fdd7e71b8ad0!8m2!3d29.8762177!4d-90.096274!9m1!1b1!16s%2Fg%2F11xkyynll6?entry=ttu&g_ep=EgoyMDI1MTExNy4wIKXMDSoASAFQAw%3D%3D&lite=1' AS GoogleMapsUrl FROM core.Project p WHERE LTRIM(RTRIM(ISNULL(p.ProjectName,N''))) = N'The Waters at Promenade') AS s ON t.ProjectId = s.ProjectId
WHEN MATCHED THEN UPDATE SET GoogleMapsUrl = s.GoogleMapsUrl, UpdatedAt = SYSDATETIME()
WHEN NOT MATCHED BY TARGET AND s.ProjectId IS NOT NULL THEN INSERT (ProjectId, GoogleMapsUrl, IncludeInReviewsReport) VALUES (s.ProjectId, s.GoogleMapsUrl, 1);

PRINT 'Seed complete: Google Maps URLs upserted into reviews.PropertyReviewConfig for properties that exist in core.Project.';
GO
