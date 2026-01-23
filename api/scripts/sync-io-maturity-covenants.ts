#!/usr/bin/env ts-node
/**
 * Sync All Maturity Covenants for Existing Loans
 * 
 * Creates maturity covenants for all loans that have maturity dates
 * but don't have corresponding covenants yet.
 * 
 * Handles:
 * - I/O Maturity (Construction loans with IOMaturityDate)
 * - Loan Maturity (any loan with MaturityDate)
 * - Mini-Perm Maturity (loans with MiniPermMaturity)
 * - Perm Phase Maturity (loans with PermPhaseMaturity)
 * 
 * Usage: npm run db:sync-io-maturity-covenants
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

if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
};

async function syncIOMaturityCovenants() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...\n');
    pool = await sql.connect(config);
    console.log('✅ Connected!\n');

    // Find all loans with maturity dates that don't have corresponding covenants
    console.log('📋 Finding loans with maturity dates...\n');
    
    const loansResult = await pool.request().query(`
      SELECT 
        l.LoanId,
        l.ProjectId,
        p.ProjectName,
        l.LoanPhase,
        l.IOMaturityDate,
        l.MaturityDate,
        l.MiniPermMaturity,
        l.PermPhaseMaturity
      FROM banking.Loan l
      LEFT JOIN core.Project p ON l.ProjectId = p.ProjectId
      WHERE (l.IOMaturityDate IS NOT NULL 
          OR l.MaturityDate IS NOT NULL 
          OR l.MiniPermMaturity IS NOT NULL 
          OR l.PermPhaseMaturity IS NOT NULL)
      ORDER BY p.ProjectName, l.LoanId
    `);

    const loans = loansResult.recordset;
    console.log(`Found ${loans.length} loan(s) with maturity dates\n`);

    if (loans.length === 0) {
      console.log('✅ No loans with maturity dates found!\n');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('CREATING MATURITY COVENANTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    let created = 0;
    let errors = 0;

    for (const loan of loans) {
      try {
        // I/O Maturity - for Construction loans
        if (loan.IOMaturityDate && loan.LoanPhase === 'Construction') {
          const existing = await pool.request()
            .input('loanId', sql.Int, loan.LoanId)
            .input('covenantType', sql.NVarChar, 'I/O Maturity')
            .query('SELECT CovenantId FROM banking.Covenant WHERE LoanId = @loanId AND CovenantType = @covenantType');
          
          if (existing.recordset.length === 0) {
            const maturityDate = new Date(loan.IOMaturityDate);
            await pool.request()
              .input('projectId', sql.Int, loan.ProjectId)
              .input('loanId', sql.Int, loan.LoanId)
              .input('covenantType', sql.NVarChar, 'I/O Maturity')
              .input('covenantDate', sql.Date, maturityDate)
              .input('requirement', sql.NVarChar, 'Construction I/O Maturity')
              .query(`
                INSERT INTO banking.Covenant (ProjectId, LoanId, CovenantType, CovenantDate, Requirement, IsCompleted)
                VALUES (@projectId, @loanId, @covenantType, @covenantDate, @requirement, 0)
              `);
            created++;
            const dateStr = maturityDate.toISOString().split('T')[0];
            console.log(`✅ Created I/O Maturity covenant: ${loan.ProjectName || `Project ID ${loan.ProjectId}`} | Date: ${dateStr}`);
          }
        }

        // General Maturity Date
        if (loan.MaturityDate) {
          const maturityType = loan.LoanPhase === 'Construction' ? 'Loan Maturity' : 
                               loan.LoanPhase === 'Permanent' ? 'Permanent Loan Maturity' :
                               loan.LoanPhase === 'MiniPerm' ? 'Mini-Perm Maturity' :
                               'Loan Maturity';
          const requirement = `${loan.LoanPhase} Loan Maturity`;
          
          const existing = await pool.request()
            .input('loanId', sql.Int, loan.LoanId)
            .input('covenantType', sql.NVarChar, maturityType)
            .query('SELECT CovenantId FROM banking.Covenant WHERE LoanId = @loanId AND CovenantType = @covenantType');
          
          if (existing.recordset.length === 0) {
            const maturityDate = new Date(loan.MaturityDate);
            await pool.request()
              .input('projectId', sql.Int, loan.ProjectId)
              .input('loanId', sql.Int, loan.LoanId)
              .input('covenantType', sql.NVarChar, maturityType)
              .input('covenantDate', sql.Date, maturityDate)
              .input('requirement', sql.NVarChar, requirement)
              .query(`
                INSERT INTO banking.Covenant (ProjectId, LoanId, CovenantType, CovenantDate, Requirement, IsCompleted)
                VALUES (@projectId, @loanId, @covenantType, @covenantDate, @requirement, 0)
              `);
            created++;
            const dateStr = maturityDate.toISOString().split('T')[0];
            console.log(`✅ Created ${maturityType} covenant: ${loan.ProjectName || `Project ID ${loan.ProjectId}`} | Date: ${dateStr}`);
          }
        }

        // Mini-Perm Maturity
        if (loan.MiniPermMaturity) {
          const existing = await pool.request()
            .input('loanId', sql.Int, loan.LoanId)
            .input('covenantType', sql.NVarChar, 'Mini-Perm Maturity')
            .query('SELECT CovenantId FROM banking.Covenant WHERE LoanId = @loanId AND CovenantType = @covenantType');
          
          if (existing.recordset.length === 0) {
            const maturityDate = new Date(loan.MiniPermMaturity);
            await pool.request()
              .input('projectId', sql.Int, loan.ProjectId)
              .input('loanId', sql.Int, loan.LoanId)
              .input('covenantType', sql.NVarChar, 'Mini-Perm Maturity')
              .input('covenantDate', sql.Date, maturityDate)
              .input('requirement', sql.NVarChar, 'Mini-Perm Loan Maturity')
              .query(`
                INSERT INTO banking.Covenant (ProjectId, LoanId, CovenantType, CovenantDate, Requirement, IsCompleted)
                VALUES (@projectId, @loanId, @covenantType, @covenantDate, @requirement, 0)
              `);
            created++;
            const dateStr = maturityDate.toISOString().split('T')[0];
            console.log(`✅ Created Mini-Perm Maturity covenant: ${loan.ProjectName || `Project ID ${loan.ProjectId}`} | Date: ${dateStr}`);
          }
        }

        // Perm Phase Maturity
        if (loan.PermPhaseMaturity) {
          const existing = await pool.request()
            .input('loanId', sql.Int, loan.LoanId)
            .input('covenantType', sql.NVarChar, 'Perm Phase Maturity')
            .query('SELECT CovenantId FROM banking.Covenant WHERE LoanId = @loanId AND CovenantType = @covenantType');
          
          if (existing.recordset.length === 0) {
            const maturityDate = new Date(loan.PermPhaseMaturity);
            await pool.request()
              .input('projectId', sql.Int, loan.ProjectId)
              .input('loanId', sql.Int, loan.LoanId)
              .input('covenantType', sql.NVarChar, 'Perm Phase Maturity')
              .input('covenantDate', sql.Date, maturityDate)
              .input('requirement', sql.NVarChar, 'Permanent Phase Maturity')
              .query(`
                INSERT INTO banking.Covenant (ProjectId, LoanId, CovenantType, CovenantDate, Requirement, IsCompleted)
                VALUES (@projectId, @loanId, @covenantType, @covenantDate, @requirement, 0)
              `);
            created++;
            const dateStr = maturityDate.toISOString().split('T')[0];
            console.log(`✅ Created Perm Phase Maturity covenant: ${loan.ProjectName || `Project ID ${loan.ProjectId}`} | Date: ${dateStr}`);
          }
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Failed to create covenant for ${loan.ProjectName || `Project ID ${loan.ProjectId}`}: ${error.message}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Created: ${created} covenant(s)`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`);
    }
    console.log('');

    // Verify the results
    const verifyResult = await pool.request().query(`
      SELECT CovenantType, COUNT(*) AS Count
      FROM banking.Covenant
      WHERE CovenantType IN ('I/O Maturity', 'Loan Maturity', 'Permanent Loan Maturity', 'Mini-Perm Maturity', 'Perm Phase Maturity')
      GROUP BY CovenantType
      ORDER BY CovenantType
    `);

    console.log('📊 Maturity covenants by type:');
    verifyResult.recordset.forEach((row: any) => {
      console.log(`   ${row.CovenantType}: ${row.Count}`);
    });

    console.log('\n✅ Sync complete!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.number) {
      console.error(`   SQL Error Number: ${error.number}`);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the sync
syncIOMaturityCovenants();
