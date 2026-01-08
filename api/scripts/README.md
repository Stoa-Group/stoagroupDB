# Database Manipulation Scripts

Direct database access utilities using mssql to connect to Azure SQL Database.

---

## 🚀 Quick Start

### Prerequisites

Make sure you have a `.env` file in the `api/` directory with:
```env
DB_SERVER=stoagroupdb.database.windows.net
DB_DATABASE=stoagroupDB
DB_USER=arovner
DB_PASSWORD=your_password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

---

## 📝 Usage

### Query Data (SELECT)

```bash
npm run db:query "SELECT * FROM core.Project"
npm run db:query "SELECT ProjectName, City, State FROM core.Project WHERE State = 'LA'"
npm run db:query "SELECT * FROM banking.Loan WHERE ProjectId = 1"
```

### Execute Commands (INSERT, UPDATE, DELETE)

```bash
npm run db:exec "UPDATE core.Project SET Units = 250 WHERE ProjectId = 1"
npm run db:exec "INSERT INTO core.Bank (BankName, City, State) VALUES ('Test Bank', 'New Orleans', 'LA')"
npm run db:exec "DELETE FROM core.Bank WHERE BankName = 'Test Bank'"
```

### Execute Stored Procedures

```bash
npm run db:sp "sp_GetProjects" '{"param1": "value1"}'
```

---

## 💻 Use in Your Code

### Import and Use

```typescript
import { query, execute, getPool } from './scripts/db-manipulate';

// Query data
const projects = await query('SELECT * FROM core.Project');
console.log(projects);

// Execute command
const result = await execute('UPDATE core.Project SET Units = 200 WHERE ProjectId = 1');
console.log(`Rows affected: ${result.rowsAffected}`);

// Get connection pool for advanced usage
const pool = await getPool();
const result = await pool.request()
  .input('id', sql.Int, 1)
  .query('SELECT * FROM core.Project WHERE ProjectId = @id');
await pool.close();
```

---

## 📋 Common Examples

### Get All Projects
```bash
npm run db:query "SELECT * FROM core.Project ORDER BY ProjectName"
```

### Update Project Units
```bash
npm run db:exec "UPDATE core.Project SET Units = 300 WHERE ProjectId = 1"
```

### Get Loans for a Project
```bash
npm run db:query "SELECT * FROM banking.Loan WHERE ProjectId = 1"
```

### Create a New Bank
```bash
npm run db:exec "INSERT INTO core.Bank (BankName, City, State) VALUES ('New Bank', 'Baton Rouge', 'LA')"
```

### Get Projects with Loans
```bash
npm run db:query "SELECT p.ProjectName, l.LoanAmount, l.LoanPhase FROM core.Project p INNER JOIN banking.Loan l ON p.ProjectId = l.ProjectId"
```

### Update Loan Amount
```bash
npm run db:exec "UPDATE banking.Loan SET LoanAmount = 20000000 WHERE LoanId = 1"
```

---

## 🔒 Security Notes

- ✅ Uses parameterized queries (SQL injection protection)
- ✅ Connection credentials from `.env` (not hardcoded)
- ✅ Encrypted connection to Azure SQL Database
- ⚠️ Be careful with DELETE and UPDATE statements
- ⚠️ Always test queries first with SELECT

---

## 🛠️ Advanced Usage

### Using Connection Pool Directly

```typescript
import { getPool } from './scripts/db-manipulate';
import sql from 'mssql';

const pool = await getPool();

// Parameterized query
const result = await pool.request()
  .input('projectId', sql.Int, 1)
  .input('loanPhase', sql.NVarChar, 'Construction')
  .query(`
    SELECT * FROM banking.Loan 
    WHERE ProjectId = @projectId AND LoanPhase = @loanPhase
  `);

console.log(result.recordset);

await pool.close();
```

### Transaction Example

```typescript
import { getPool } from './scripts/db-manipulate';
import sql from 'mssql';

const pool = await getPool();
const transaction = new sql.Transaction(pool);

try {
  await transaction.begin();
  const request = new sql.Request(transaction);
  
  await request
    .input('projectId', sql.Int, 1)
    .input('amount', sql.Decimal(18, 2), 15000000)
    .query('INSERT INTO banking.Loan (ProjectId, LoanAmount) VALUES (@projectId, @amount)');
  
  await transaction.commit();
  console.log('Transaction committed');
} catch (error) {
  await transaction.rollback();
  console.error('Transaction rolled back:', error);
} finally {
  await pool.close();
}
```

---

## 📚 Available Functions

### `query(sqlQuery: string): Promise<any[]>`
Execute a SELECT query and return results.

### `execute(sqlQuery: string): Promise<{ rowsAffected: number; message?: string }>`
Execute INSERT, UPDATE, DELETE, or other DML/DDL statements.

### `executeProcedure(procedureName: string, params?: Record<string, any>): Promise<any>`
Execute a stored procedure with optional parameters.

### `getPool(): Promise<sql.ConnectionPool>`
Get a connection pool for advanced usage (transactions, etc.).

---

## 🐛 Troubleshooting

### "Cannot connect to database"
- Check your `.env` file has correct credentials
- Verify Azure SQL Database firewall allows your IP
- Check network connectivity

### "Invalid object name"
- Make sure table/schema names are correct (e.g., `core.Project`, not just `Project`)
- Verify you're connected to the right database

### "Permission denied"
- Check your database user has necessary permissions
- Some operations may require elevated permissions

---

## 💡 Tips

1. **Always test with SELECT first** before running UPDATE/DELETE
2. **Use transactions** for multiple related operations
3. **Use parameterized queries** to prevent SQL injection
4. **Close connections** when done (handled automatically by the script)
5. **Check rowsAffected** after UPDATE/DELETE to confirm changes
