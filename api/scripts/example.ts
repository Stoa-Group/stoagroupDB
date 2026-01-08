/**
 * Example: Using the database manipulation utilities
 * 
 * Run with: npm run build && node dist/scripts/example.js
 * Or: ts-node scripts/example.ts
 */

import { query, execute, getPool } from './db-manipulate';
import sql from 'mssql';

async function examples() {
  try {
    console.log('=== Example 1: Query Data ===\n');
    
    // Get all projects
    const projects = await query('SELECT TOP 5 * FROM core.Project ORDER BY ProjectName');
    console.log('Projects:', JSON.stringify(projects, null, 2));
    
    console.log('\n=== Example 2: Query with WHERE ===\n');
    
    // Get projects in Louisiana
    const laProjects = await query("SELECT ProjectName, City, State FROM core.Project WHERE State = 'LA'");
    console.log('LA Projects:', JSON.stringify(laProjects, null, 2));
    
    console.log('\n=== Example 3: Using Connection Pool Directly ===\n');
    
    // Use connection pool for parameterized queries
    const pool = await getPool();
    const result = await pool.request()
      .input('state', sql.NVarChar, 'LA')
      .query('SELECT * FROM core.Project WHERE State = @state');
    console.log('Parameterized query result:', result.recordset.length, 'rows');
    await pool.close();
    
    console.log('\n=== Example 4: Execute UPDATE (commented out for safety) ===\n');
    
    // Uncomment to actually run:
    // const updateResult = await execute(`
    //   UPDATE core.Project 
    //   SET Units = 250 
    //   WHERE ProjectId = 1
    // `);
    // console.log('Update result:', updateResult);
    
    console.log('✅ All examples completed!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  examples();
}
