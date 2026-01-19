#!/usr/bin/env ts-node
/**
 * Seed FinancingType for All Participations
 * 
 * Sets FinancingType to 'Construction' for all existing participations
 * that don't have a FinancingType set
 * 
 * Usage:
 *   npm run db:seed-participation-financing-type
 */

import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load environment variables
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      console.log(`✅ Loaded .env from: ${envPath}`);
      break;
    }
  }
}

if (!envLoaded) {
  dotenv.config();
}

// Validate required environment variables
if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ Missing required environment variables!');
  console.error('Required:');
  console.error('   - DB_SERVER');
  console.error('   - DB_DATABASE');
  console.error('   - DB_USER');
  console.error('   - DB_PASSWORD');
  process.exit(1);
}

const config: sql.config = {
  server: process.env.DB_SERVER!,
  database: process.env.DB_DATABASE!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
};

async function getPool(): Promise<sql.ConnectionPool> {
  try {
    const pool = await sql.connect(config);
    console.log('✅ Connected to database');
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('🚀 Seeding FinancingType for all participations...\n');
  
  const pool = await getPool();
  
  try {
    // First, check current state
    const checkResult = await pool.request().query(`
      SELECT 
        COUNT(*) AS TotalParticipations,
        SUM(CASE WHEN FinancingType IS NULL THEN 1 ELSE 0 END) AS NullFinancingType,
        SUM(CASE WHEN FinancingType = 'Construction' THEN 1 ELSE 0 END) AS ConstructionCount,
        SUM(CASE WHEN FinancingType = 'Permanent' THEN 1 ELSE 0 END) AS PermanentCount
      FROM banking.Participation
    `);
    
    const stats = checkResult.recordset[0];
    console.log('📊 Current State:');
    console.log(`   - Total Participations: ${stats.TotalParticipations}`);
    console.log(`   - NULL FinancingType: ${stats.NullFinancingType}`);
    console.log(`   - Already 'Construction': ${stats.ConstructionCount}`);
    console.log(`   - Already 'Permanent': ${stats.PermanentCount}`);
    console.log('');
    
    if (stats.NullFinancingType === 0) {
      console.log('✅ All participations already have FinancingType set!');
      return;
    }
    
    // Update all NULL FinancingType to 'Construction'
    console.log(`🔄 Setting FinancingType to 'Construction' for ${stats.NullFinancingType} participation(s)...`);
    
    const updateResult = await pool.request()
      .input('financingType', sql.NVarChar, 'Construction')
      .query(`
        UPDATE banking.Participation
        SET FinancingType = @financingType,
            UpdatedAt = SYSDATETIME()
        WHERE FinancingType IS NULL
      `);
    
    const rowsAffected = updateResult.rowsAffected[0] || 0;
    console.log(`✅ Updated ${rowsAffected} participation(s) to FinancingType = 'Construction'`);
    console.log('');
    
    // Verify the update
    const verifyResult = await pool.request().query(`
      SELECT 
        COUNT(*) AS TotalParticipations,
        SUM(CASE WHEN FinancingType IS NULL THEN 1 ELSE 0 END) AS NullFinancingType,
        SUM(CASE WHEN FinancingType = 'Construction' THEN 1 ELSE 0 END) AS ConstructionCount,
        SUM(CASE WHEN FinancingType = 'Permanent' THEN 1 ELSE 0 END) AS PermanentCount
      FROM banking.Participation
    `);
    
    const finalStats = verifyResult.recordset[0];
    console.log('📊 Final State:');
    console.log(`   - Total Participations: ${finalStats.TotalParticipations}`);
    console.log(`   - NULL FinancingType: ${finalStats.NullFinancingType}`);
    console.log(`   - 'Construction': ${finalStats.ConstructionCount}`);
    console.log(`   - 'Permanent': ${finalStats.PermanentCount}`);
    console.log('');
    
    if (finalStats.NullFinancingType === 0) {
      console.log('✅ Success! All participations now have FinancingType set.');
    } else {
      console.log(`⚠️  Warning: ${finalStats.NullFinancingType} participation(s) still have NULL FinancingType`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding FinancingType:', error);
    process.exit(1);
  } finally {
    await pool.close();
    console.log('\n🔌 Database connection closed');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
