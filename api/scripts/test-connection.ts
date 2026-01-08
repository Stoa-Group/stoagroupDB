#!/usr/bin/env ts-node
/**
 * Quick test to verify database connection
 * 
 * Usage: npm run db:test
 * Or: ts-node scripts/test-connection.ts
 */

import { query, getPool } from './db-manipulate';
import sql from 'mssql';

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...\n');
    
    // Test 1: Simple query
    console.log('Test 1: Querying database...');
    const result = await query('SELECT DB_NAME() AS DatabaseName, SYSTEM_USER AS CurrentUser');
    console.log('✅ Connected successfully!');
    console.log('   Database:', result[0].DatabaseName);
    console.log('   User:', result[0].CurrentUser);
    
    // Test 2: Check if we can query a table
    console.log('\nTest 2: Querying core.Project table...');
    const projects = await query('SELECT COUNT(*) AS ProjectCount FROM core.Project');
    console.log('✅ Table accessible!');
    console.log('   Total projects:', projects[0].ProjectCount);
    
    // Test 3: Get a sample project
    console.log('\nTest 3: Getting sample project...');
    const sample = await query('SELECT TOP 1 ProjectName, City, State FROM core.Project');
    if (sample.length > 0) {
      console.log('✅ Sample project:');
      console.log('   Name:', sample[0].ProjectName);
      console.log('   Location:', `${sample[0].City}, ${sample[0].State}`);
    } else {
      console.log('   No projects found in database');
    }
    
    // Test 4: Test connection pool
    console.log('\nTest 4: Testing connection pool...');
    const pool = await getPool();
    const poolResult = await pool.request()
      .input('test', sql.NVarChar, 'test')
      .query('SELECT @test AS TestValue');
    console.log('✅ Connection pool working!');
    console.log('   Test value:', poolResult.recordset[0].TestValue);
    await pool.close();
    
    console.log('\n✅ All tests passed! Database connection is working correctly.');
    console.log('\nYou can now use:');
    console.log('  npm run db:query "SELECT * FROM core.Project"');
    console.log('  npm run db:exec "UPDATE core.Project SET Units = 100 WHERE ProjectId = 1"');
    
  } catch (error: any) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your .env file has correct credentials');
    console.error('2. Verify Azure SQL Database firewall allows your IP');
    console.error('3. Check that DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD are set');
    process.exit(1);
  }
}

if (require.main === module) {
  testConnection();
}
