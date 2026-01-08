# Audit Tracking System Guide

## Overview

The audit tracking system automatically captures all changes to your database, allowing you to:
- **See what data looked like yesterday** (or any date)
- **Track who made changes** and when
- **View complete change history** for any project
- **Compare current vs historical** values

## How It Works

### Automatic Tracking
- **Triggers** automatically capture all INSERT, UPDATE, and DELETE operations
- **History tables** store complete snapshots of data at each point in time
- **Audit log** records individual field changes

### What Gets Tracked
- ✅ **Projects** - All changes to project details (name, location, units, stage, etc.)
- ✅ **Loans** - All changes to loan information
- ⚠️ **Other tables** - Can be added as needed

## Key Tables

### 1. `audit.AuditLog`
- Records every individual field change
- Shows old value → new value
- Tracks who made the change and when

### 2. `audit.ProjectHistory`
- Complete snapshots of Project table at each point in time
- Allows you to see the full state of a project on any date
- `ValidFrom` = when this version became active
- `ValidTo` = when this version was replaced (NULL = current)

### 3. `audit.LoanHistory`
- Complete snapshots of Loan table
- Same structure as ProjectHistory

## Common Queries

### See Project as of Yesterday
```sql
SELECT * 
FROM dbo.fn_GetProjectAsOfDate(41, DATEADD(day, -1, GETDATE()));
```

### See All Versions of a Project
```sql
SELECT * 
FROM dbo.fn_GetProjectChangeHistory(41)
ORDER BY ValidFrom DESC;
```

### See Recent Changes
```sql
SELECT * 
FROM vw_RecentChanges
WHERE ChangedAt >= DATEADD(day, -7, GETDATE());
```

### See What Changed in a Specific Field
```sql
SELECT * 
FROM audit.AuditLog
WHERE TableName = 'core.Project'
  AND ColumnName = 'Units'
  AND RecordId = 41
ORDER BY ChangedAt DESC;
```

## For Domo Integration

### DataSets to Create in Domo:

1. **STOA - Recent Changes**
   - Query: `SELECT * FROM vw_RecentChanges WHERE ChangedAt >= DATEADD(day, -30, GETDATE())`
   - Refresh: Daily
   - Use for: Change tracking dashboard

2. **STOA - Project History**
   - Query: `SELECT * FROM audit.ProjectHistory ORDER BY ProjectId, ValidFrom DESC`
   - Refresh: Daily
   - Use for: Historical project analysis

3. **STOA - Audit Log**
   - Query: `SELECT * FROM audit.AuditLog ORDER BY ChangedAt DESC`
   - Refresh: Daily
   - Use for: Detailed change tracking

## Example Use Cases

### Use Case 1: "What did The Waters at Hammond look like yesterday?"
```sql
-- Find the ProjectId first
SELECT ProjectId FROM core.Project WHERE ProjectName = 'The Waters at Hammond';

-- Then get yesterday's version (assuming ProjectId = 41)
SELECT * 
FROM dbo.fn_GetProjectAsOfDate(41, DATEADD(day, -1, GETDATE()));
```

### Use Case 2: "Who changed the units count and when?"
```sql
SELECT 
    al.ChangedAt,
    al.ChangedBy,
    al.OldValue AS PreviousUnits,
    al.NewValue AS NewUnits,
    p.ProjectName
FROM audit.AuditLog al
JOIN core.Project p ON p.ProjectId = al.RecordId
WHERE al.TableName = 'core.Project'
  AND al.ColumnName = 'Units'
  AND p.ProjectName = 'The Waters at Hammond'
ORDER BY al.ChangedAt DESC;
```

### Use Case 3: "Show me all changes made in the last week"
```sql
SELECT 
    al.ChangedAt,
    al.TableName,
    al.ColumnName,
    al.ChangeType,
    al.OldValue,
    al.NewValue,
    al.ChangedBy,
    p.ProjectName
FROM audit.AuditLog al
LEFT JOIN core.Project p ON p.ProjectId = al.RecordId AND al.TableName = 'core.Project'
WHERE al.ChangedAt >= DATEADD(day, -7, GETDATE())
ORDER BY al.ChangedAt DESC;
```

## Important Notes

1. **Automatic**: Changes are tracked automatically - no manual steps needed
2. **Performance**: History tables are indexed for fast queries
3. **Storage**: History tables will grow over time - consider archiving old data periodically
4. **Domo Writeback**: When Domo writes data back, it will be automatically tracked
5. **User Tracking**: Currently uses `SYSTEM_USER` - can be enhanced to track Domo user if available

## Maintenance

### View Storage Usage
```sql
SELECT 
    t.name AS TableName,
    SUM(p.rows) AS RowCount,
    SUM(a.total_pages) * 8 / 1024 AS TotalSizeMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.schema_id = SCHEMA_ID('audit')
GROUP BY t.name
ORDER BY TotalSizeMB DESC;
```

### Archive Old Data (Optional)
```sql
-- Example: Archive audit logs older than 1 year
-- CREATE TABLE audit.AuditLogArchive (...);
-- INSERT INTO audit.AuditLogArchive SELECT * FROM audit.AuditLog WHERE ChangedAt < DATEADD(year, -1, GETDATE());
-- DELETE FROM audit.AuditLog WHERE ChangedAt < DATEADD(year, -1, GETDATE());
```

## Next Steps

1. **Run the audit setup script**: `07_create_audit_tracking.sql`
2. **Test it**: Make a change to a project and check the history
3. **Create Domo DataSets**: Use queries from `08_domo_history_queries.sql`
4. **Build dashboards**: Create change tracking dashboards in Domo

