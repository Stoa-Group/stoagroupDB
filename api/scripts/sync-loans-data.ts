#!/usr/bin/env ts-node
/**
 * Complete Loans Data Sync
 * 
 * Syncs all loan data, participations, guarantees, DSCR tests, covenants, and liquidity requirements
 * Uses direct database connections (not API)
 * 
 * Usage: npm run db:sync-loans
 */

import { getPool } from './db-manipulate';
import sql from 'mssql';

// Helper functions
function parseAmount(str: string | null | undefined): number | null {
  if (!str || str.trim() === '' || str === 'N/A' || str === '-') return null;
  return parseFloat(str.replace(/[$,]/g, '')) || null;
}

function parseDate(str: string | null | undefined): string | null {
  if (!str || str.trim() === '' || str === 'N/A') return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return null;
}

async function getProjectId(pool: sql.ConnectionPool, projectName: string): Promise<number | null> {
  const result = await pool.request()
    .input('name', sql.NVarChar, projectName)
    .query('SELECT ProjectId FROM core.Project WHERE ProjectName = @name');
  return result.recordset.length > 0 ? result.recordset[0].ProjectId : null;
}

async function getBankId(pool: sql.ConnectionPool, bankName: string): Promise<number | null> {
  const result = await pool.request()
    .input('name', sql.NVarChar, bankName)
    .query('SELECT BankId FROM core.Bank WHERE BankName = @name');
  return result.recordset.length > 0 ? result.recordset[0].BankId : null;
}

async function getPersonId(pool: sql.ConnectionPool, personName: string): Promise<number | null> {
  const result = await pool.request()
    .input('name', sql.NVarChar, personName)
    .query('SELECT PersonId FROM core.Person WHERE FullName = @name');
  return result.recordset.length > 0 ? result.recordset[0].PersonId : null;
}

async function createLoan(pool: sql.ConnectionPool, loanData: any): Promise<number> {
  const result = await pool.request()
    .input('ProjectId', sql.Int, loanData.ProjectId)
    .input('BirthOrder', sql.Int, loanData.BirthOrder)
    .input('LoanType', sql.NVarChar, loanData.LoanType)
    .input('Borrower', sql.NVarChar, loanData.Borrower)
    .input('LoanPhase', sql.NVarChar, loanData.LoanPhase)
    .input('LenderId', sql.Int, loanData.LenderId)
    .input('LoanAmount', sql.Decimal(18, 2), loanData.LoanAmount)
    .input('LoanClosingDate', sql.Date, loanData.LoanClosingDate)
    .input('MaturityDate', sql.Date, loanData.MaturityDate)
    .input('FixedOrFloating', sql.NVarChar, loanData.FixedOrFloating)
    .input('IndexName', sql.NVarChar, loanData.IndexName)
    .input('Spread', sql.NVarChar, loanData.Spread)
    .input('InterestRate', sql.NVarChar, loanData.InterestRate)
    .input('MiniPermMaturity', sql.Date, loanData.MiniPermMaturity)
    .input('MiniPermInterestRate', sql.NVarChar, loanData.MiniPermInterestRate)
    .input('PermPhaseMaturity', sql.Date, loanData.PermPhaseMaturity)
    .input('PermPhaseInterestRate', sql.NVarChar, loanData.PermPhaseInterestRate)
    .input('ConstructionCompletionDate', sql.NVarChar, loanData.ConstructionCompletionDate)
    .input('LeaseUpCompletedDate', sql.NVarChar, loanData.LeaseUpCompletedDate)
    .input('IOMaturityDate', sql.Date, loanData.IOMaturityDate)
    .input('PermanentCloseDate', sql.Date, loanData.PermanentCloseDate)
    .input('PermanentLoanAmount', sql.Decimal(18, 2), loanData.PermanentLoanAmount)
    .query(`
      INSERT INTO banking.Loan (
        ProjectId, BirthOrder, LoanType, Borrower, LoanPhase, LenderId,
        LoanAmount, LoanClosingDate, MaturityDate, FixedOrFloating, IndexName,
        Spread, InterestRate, MiniPermMaturity, MiniPermInterestRate,
        PermPhaseMaturity, PermPhaseInterestRate, ConstructionCompletionDate,
        LeaseUpCompletedDate, IOMaturityDate, PermanentCloseDate,
        PermanentLoanAmount
      )
      VALUES (
        @ProjectId, @BirthOrder, @LoanType, @Borrower, @LoanPhase, @LenderId,
        @LoanAmount, @LoanClosingDate, @MaturityDate, @FixedOrFloating, @IndexName,
        @Spread, @InterestRate, @MiniPermMaturity, @MiniPermInterestRate,
        @PermPhaseMaturity, @PermPhaseInterestRate, @ConstructionCompletionDate,
        @LeaseUpCompletedDate, @IOMaturityDate, @PermanentCloseDate,
        @PermanentLoanAmount
      );
      SELECT LoanId FROM banking.Loan WHERE LoanId = SCOPE_IDENTITY();
    `);
  return result.recordset[0].LoanId;
}

async function createParticipation(pool: sql.ConnectionPool, partData: any): Promise<void> {
  await pool.request()
    .input('ProjectId', sql.Int, partData.ProjectId)
    .input('LoanId', sql.Int, partData.LoanId)
    .input('BankId', sql.Int, partData.BankId)
    .input('ParticipationPercent', sql.NVarChar, partData.ParticipationPercent)
    .input('ExposureAmount', sql.Decimal(18, 2), partData.ExposureAmount)
    .input('PaidOff', sql.Bit, partData.PaidOff || false)
    .query(`
      INSERT INTO banking.Participation (ProjectId, LoanId, BankId, ParticipationPercent, ExposureAmount, PaidOff)
      VALUES (@ProjectId, @LoanId, @BankId, @ParticipationPercent, @ExposureAmount, @PaidOff)
    `);
}

async function createGuarantee(pool: sql.ConnectionPool, guaranteeData: any): Promise<void> {
  await pool.request()
    .input('ProjectId', sql.Int, guaranteeData.ProjectId)
    .input('LoanId', sql.Int, guaranteeData.LoanId)
    .input('PersonId', sql.Int, guaranteeData.PersonId)
    .input('GuaranteePercent', sql.Decimal(10, 4), guaranteeData.GuaranteePercent)
    .input('GuaranteeAmount', sql.Decimal(18, 2), guaranteeData.GuaranteeAmount)
    .query(`
      INSERT INTO banking.Guarantee (ProjectId, LoanId, PersonId, GuaranteePercent, GuaranteeAmount)
      VALUES (@ProjectId, @LoanId, @PersonId, @GuaranteePercent, @GuaranteeAmount)
    `);
}

async function createDSCRTest(pool: sql.ConnectionPool, testData: any): Promise<void> {
  await pool.request()
    .input('ProjectId', sql.Int, testData.ProjectId)
    .input('LoanId', sql.Int, testData.LoanId)
    .input('TestNumber', sql.Int, testData.TestNumber)
    .input('TestDate', sql.Date, testData.TestDate)
    .input('ProjectedInterestRate', sql.NVarChar, testData.ProjectedInterestRate)
    .input('Requirement', sql.Decimal(10, 2), testData.Requirement)
    .input('ProjectedValue', sql.NVarChar, testData.ProjectedValue)
    .query(`
      INSERT INTO banking.DSCRTest (ProjectId, LoanId, TestNumber, TestDate, ProjectedInterestRate, Requirement, ProjectedValue)
      VALUES (@ProjectId, @LoanId, @TestNumber, @TestDate, @ProjectedInterestRate, @Requirement, @ProjectedValue)
    `);
}

async function createCovenant(pool: sql.ConnectionPool, covenantData: any): Promise<void> {
  await pool.request()
    .input('ProjectId', sql.Int, covenantData.ProjectId)
    .input('LoanId', sql.Int, covenantData.LoanId)
    .input('CovenantType', sql.NVarChar, covenantData.CovenantType)
    .input('CovenantDate', sql.Date, covenantData.CovenantDate)
    .input('Requirement', sql.NVarChar, covenantData.Requirement)
    .input('ProjectedValue', sql.NVarChar, covenantData.ProjectedValue)
    .input('Notes', sql.NVarChar(sql.MAX), covenantData.Notes)
    .query(`
      INSERT INTO banking.Covenant (ProjectId, LoanId, CovenantType, CovenantDate, Requirement, ProjectedValue, Notes)
      VALUES (@ProjectId, @LoanId, @CovenantType, @CovenantDate, @Requirement, @ProjectedValue, @Notes)
    `);
}

async function createLiquidityRequirement(pool: sql.ConnectionPool, liqData: any): Promise<void> {
  await pool.request()
    .input('ProjectId', sql.Int, liqData.ProjectId)
    .input('LoanId', sql.Int, liqData.LoanId)
    .input('TotalAmount', sql.Decimal(18, 2), liqData.TotalAmount)
    .input('LendingBankAmount', sql.Decimal(18, 2), liqData.LendingBankAmount)
    .query(`
      INSERT INTO banking.LiquidityRequirement (ProjectId, LoanId, TotalAmount, LendingBankAmount)
      VALUES (@ProjectId, @LoanId, @TotalAmount, @LendingBankAmount)
    `);
}

async function syncLoansData() {
  console.log('🚀 Starting Loans Data Sync...\n');
  const pool = await getPool();
  
  try {
    // Example: The Waters at Settlers Trace
    console.log('📝 Processing loans...');
    
    // Get IDs
    const settlersTraceId = await getProjectId(pool, 'The Waters at Settlers Trace');
    const b1BankId = await getBankId(pool, 'b1Bank');
    
    if (!settlersTraceId || !b1BankId) {
      console.error('❌ Missing project or bank');
      return;
    }
    
    console.log(`  Project ID: ${settlersTraceId}, Bank ID: ${b1BankId}`);
    
    // Create loan
    const loanId = await createLoan(pool, {
      ProjectId: settlersTraceId,
      BirthOrder: 12,
      LoanType: 'LOC - Construction',
      Borrower: 'The Waters at Settlers Trace',
      LoanPhase: 'Construction',
      LenderId: b1BankId,
      LoanAmount: 49996842,
      LoanClosingDate: parseDate('8/24/2022'),
      IOMaturityDate: parseDate('8/24/2025'),
      FixedOrFloating: 'Floating',
      IndexName: 'WSJ Prime',
      Spread: '0.50%',
      PermPhaseMaturity: parseDate('8/24/2028'),
      PermPhaseInterestRate: '3yr US Treasury + 250 - 25yr am',
      ConstructionCompletionDate: 'Feb-10',
      LeaseUpCompletedDate: 'Dec-25',
      PermanentCloseDate: parseDate('6/30/2026'),
      PermanentLoanAmount: 54163986,
    });
    
    console.log(`  ✓ Created loan (ID: ${loanId})`);
    
    // Add participations
    const participations = [
      { bank: 'b1Bank', percent: '32.0%', exposure: 15998489 },
      { bank: 'The Citizens Bank', percent: '16.0%', exposure: 7999995 },
      { bank: 'Rayne State Bank', percent: '4.0%', exposure: 1999874 },
      { bank: 'Catalyst Bank', percent: '10.0%', exposure: 4999684 },
      { bank: 'Community First Bank', percent: '10.0%', exposure: 4999684 },
      { bank: 'BOM Bank', percent: '10.0%', exposure: 4999684 },
      { bank: 'CLB Bank', percent: '8.0%', exposure: 3999747 },
      { bank: 'FNB Jeanerette', percent: '10.0%', exposure: 4999684 },
    ];
    
    for (const part of participations) {
      const bankId = await getBankId(pool, part.bank);
      if (bankId) {
        await createParticipation(pool, {
          ProjectId: settlersTraceId,
          LoanId: loanId,
          BankId: bankId,
          ParticipationPercent: part.percent,
          ExposureAmount: part.exposure,
          PaidOff: false,
        });
        console.log(`  ✓ Added participation: ${part.bank}`);
      }
    }
    
    // Add guarantees
    const guarantors = ['Toby Easterly', 'Ryan Nash', 'Saun Sullivan'];
    for (const name of guarantors) {
      const personId = await getPersonId(pool, name);
      if (personId) {
        await createGuarantee(pool, {
          ProjectId: settlersTraceId,
          LoanId: loanId,
          PersonId: personId,
          GuaranteePercent: 100,
          GuaranteeAmount: 45698,
        });
        console.log(`  ✓ Added guarantee: ${name}`);
      }
    }
    
    // Add DSCR tests
    await createDSCRTest(pool, {
      ProjectId: settlersTraceId,
      LoanId: loanId,
      TestNumber: 1,
      TestDate: parseDate('9/30/2025'),
      ProjectedInterestRate: '8.00%',
      Requirement: 1.00,
      ProjectedValue: '0.41',
    });
    
    await createDSCRTest(pool, {
      ProjectId: settlersTraceId,
      LoanId: loanId,
      TestNumber: 2,
      TestDate: parseDate('9/30/2026'),
      ProjectedInterestRate: '6.76%',
      Requirement: 1.10,
      ProjectedValue: '1.08',
    });
    
    console.log('  ✓ Added DSCR tests');
    
    // Add liquidity requirement
    await createLiquidityRequirement(pool, {
      ProjectId: settlersTraceId,
      LoanId: loanId,
      TotalAmount: 5000000,
      LendingBankAmount: 2000000,
    });
    
    console.log('  ✓ Added liquidity requirement');
    
    console.log('\n✅ Example loan data sync completed!');
    console.log('\n💡 To add all loans, expand this script with all loan data from your spreadsheets.');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

if (require.main === module) {
  syncLoansData().catch(console.error);
}
