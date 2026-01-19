#!/usr/bin/env ts-node
/**
 * Remove Duplicate Parent Holding Company Equity Commitments
 * 
 * Identifies and removes equity commitments for parent holding companies
 * (like "Stoa Holdings, LLC") that duplicate actual investment entities
 * (like "DBM Bluebonnet, LLC") with the same Amount, FundingDate, and ProjectId
 * 
 * Usage:
 *   npm run db:remove-duplicate-parent-holdings
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
  console.log('🚀 Identifying duplicate parent holding company commitments...\n');
  
  const pool = await getPool();
  
  try {
    // Find duplicate commitments where Stoa Holdings, LLC has the same Amount, FundingDate, and ProjectId as another partner
    const duplicatesResult = await pool.request().query(`
      SELECT 
        ec1.EquityCommitmentId AS ParentCommitmentId,
        ec1.ProjectId,
        p.ProjectName,
        ep1.PartnerName AS ParentPartnerName,
        ec1.Amount,
        ec1.FundingDate,
        ec2.EquityCommitmentId AS ActualCommitmentId,
        ep2.PartnerName AS ActualPartnerName
      FROM banking.EquityCommitment ec1
      INNER JOIN core.EquityPartner ep1 ON ec1.EquityPartnerId = ep1.EquityPartnerId
      INNER JOIN banking.EquityCommitment ec2 ON 
        ec1.ProjectId = ec2.ProjectId
        AND ABS(COALESCE(ec1.Amount, 0) - COALESCE(ec2.Amount, 0)) < 0.01
        AND (
          (ec1.FundingDate IS NULL AND ec2.FundingDate IS NULL)
          OR (ec1.FundingDate = ec2.FundingDate)
        )
        AND ec1.EquityCommitmentId <> ec2.EquityCommitmentId
      INNER JOIN core.EquityPartner ep2 ON ec2.EquityPartnerId = ep2.EquityPartnerId
      INNER JOIN core.Project p ON ec1.ProjectId = p.ProjectId
      WHERE ep1.PartnerName LIKE '%Stoa Holdings%'
        AND ep2.PartnerName NOT LIKE '%Stoa Holdings%'
        AND ep2.PartnerName NOT LIKE '%Holdings%'
      ORDER BY ec1.ProjectId, ec1.Amount DESC, ec1.FundingDate
    `);
    
    const duplicates = duplicatesResult.recordset;
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate parent holding company commitments found!');
      return;
    }
    
    console.log(`📊 Found ${duplicates.length} duplicate parent holding commitments:\n`);
    
    // Group by project for better display
    const byProject: { [key: string]: any[] } = {};
    duplicates.forEach((dup: any) => {
      const key = `${dup.ProjectId}-${dup.ProjectName}`;
      if (!byProject[key]) {
        byProject[key] = [];
      }
      byProject[key].push(dup);
    });
    
    Object.keys(byProject).forEach(key => {
      const projectDups = byProject[key];
      const first = projectDups[0];
      console.log(`📁 ${first.ProjectName} (ProjectId: ${first.ProjectId}):`);
      projectDups.forEach((dup: any) => {
        console.log(`   - Stoa Holdings: $${dup.Amount?.toLocaleString()} (${dup.FundingDate ? new Date(dup.FundingDate).toLocaleDateString() : 'No date'})`);
        console.log(`     → Duplicate of: ${dup.ActualPartnerName} (CommitmentId: ${dup.ActualCommitmentId})`);
        console.log(`     → Will DELETE: CommitmentId ${dup.ParentCommitmentId}`);
      });
      console.log('');
    });
    
    // Get unique commitment IDs to delete
    const commitmentIdsToDelete = [...new Set(duplicates.map((d: any) => d.ParentCommitmentId))];
    
    console.log(`\n⚠️  About to delete ${commitmentIdsToDelete.length} duplicate parent holding commitments...`);
    console.log(`   Commitment IDs: ${commitmentIdsToDelete.join(', ')}\n`);
    
    // Delete the duplicate parent commitments one by one
    // Note: Related parties will be automatically deleted due to CASCADE
    let deletedCount = 0;
    for (const id of commitmentIdsToDelete) {
      try {
        const result = await pool.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM banking.EquityCommitment WHERE EquityCommitmentId = @id');
        
        if (result.rowsAffected[0] > 0) {
          deletedCount++;
          console.log(`   ✓ Deleted CommitmentId ${id}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error deleting CommitmentId ${id}:`, error.message);
      }
    }
    
    console.log(`✅ Successfully deleted ${deletedCount} duplicate parent holding commitments!`);
    console.log('');
    
    // Verify remaining Stoa Holdings commitments
    const remainingResult = await pool.request().query(`
      SELECT 
        COUNT(*) AS RemainingCount,
        SUM(ec.Amount) AS TotalAmount
      FROM banking.EquityCommitment ec
      INNER JOIN core.EquityPartner ep ON ec.EquityPartnerId = ep.EquityPartnerId
      WHERE ep.PartnerName LIKE '%Stoa Holdings%'
    `);
    
    const remaining = remainingResult.recordset[0];
    console.log('📊 Remaining Stoa Holdings, LLC commitments:');
    console.log(`   - Count: ${remaining.RemainingCount}`);
    console.log(`   - Total Amount: $${remaining.TotalAmount?.toLocaleString() || '0'}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error removing duplicate parent holdings:', error);
    process.exit(1);
  } finally {
    await pool.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
