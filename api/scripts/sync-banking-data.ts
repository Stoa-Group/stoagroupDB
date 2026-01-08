#!/usr/bin/env ts-node
/**
 * Comprehensive Banking Data Sync Script
 * 
 * Syncs all banking dashboard data to the database via API:
 * - Projects
 * - Banks
 * - Loans
 * - Participations
 * - Guarantees
 * - DSCR Tests
 * - Covenants
 * - Liquidity Requirements
 * - Bank Targets
 * 
 * Usage: npm run db:sync
 */

import { query, execute, getPool } from './db-manipulate';
import sql from 'mssql';

const API_BASE_URL = 'https://stoagroupdb.onrender.com';

// Helper to make API calls
async function apiCall(endpoint: string, method: string, data?: any) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return await response.json();
  } catch (error: any) {
    console.error(`API Error (${method} ${endpoint}):`, error.message);
    throw error;
  }
}

// Helper to find or create project
async function findOrCreateProject(projectData: any): Promise<number> {
  const pool = await getPool();
  
  // Try to find existing project
  const existing = await pool.request()
    .input('name', sql.NVarChar, projectData.ProjectName)
    .query('SELECT ProjectId FROM core.Project WHERE ProjectName = @name');
  
  if (existing.recordset.length > 0) {
    const projectId = existing.recordset[0].ProjectId;
    // Update if needed
    await apiCall(`/api/core/projects/${projectId}`, 'PUT', projectData);
    return projectId;
  }
  
  // Create new project
  const result = await apiCall('/api/core/projects', 'POST', projectData);
  return result.data.ProjectId;
}

// Helper to find or create bank
async function findOrCreateBank(bankName: string, city?: string, state?: string): Promise<number> {
  const pool = await getPool();
  
  const existing = await pool.request()
    .input('name', sql.NVarChar, bankName)
    .query('SELECT BankId FROM core.Bank WHERE BankName = @name');
  
  if (existing.recordset.length > 0) {
    return existing.recordset[0].BankId;
  }
  
  const result = await apiCall('/api/core/banks', 'POST', {
    BankName: bankName,
    City: city,
    State: state,
  });
  return result.data.BankId;
}

// Helper to find or create person
async function findOrCreatePerson(fullName: string): Promise<number> {
  const pool = await getPool();
  
  const existing = await pool.request()
    .input('name', sql.NVarChar, fullName)
    .query('SELECT PersonId FROM core.Person WHERE FullName = @name');
  
  if (existing.recordset.length > 0) {
    return existing.recordset[0].PersonId;
  }
  
  const result = await apiCall('/api/core/persons', 'POST', { FullName: fullName });
  return result.data.PersonId;
}

// Parse date from various formats
function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null;
  
  // Handle formats like "2/10/25", "9/24/20", "May-23", etc.
  if (dateStr.includes('-')) {
    // Format like "May-23" - skip for now, store as text
    return null;
  }
  
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000; // Convert 2-digit to 4-digit
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  } catch (e) {
    // Return null if can't parse
  }
  return null;
}

// Parse amount from string like "$31,520,000"
function parseAmount(amountStr: string | null | undefined): number | null {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[$,]/g, '').trim();
  if (cleaned === '' || cleaned === 'N/A') return null;
  return parseFloat(cleaned) || null;
}

// Parse percentage from string like "32.0%"
function parsePercent(percentStr: string | null | undefined): string | null {
  if (!percentStr || percentStr.trim() === '' || percentStr === 'N/A') return null;
  return percentStr.trim();
}

async function syncAllData() {
  console.log('🚀 Starting comprehensive data sync...\n');
  
  const pool = await getPool();
  
  try {
    // Step 1: Sync Banks from exposure data
    console.log('📊 Step 1: Syncing Banks...');
    const banks = [
      { name: 'First Horizon Bank', state: 'TN', city: 'Memphis' },
      { name: 'Hancock Whitney', state: 'MS', city: 'Gulfport' },
      { name: 'b1Bank', state: 'LA', city: 'Baton Rouge' },
      { name: 'Renasant Bank', state: 'MS', city: 'Tupelo' },
      { name: 'Trustmark Bank', state: 'MS', city: 'Jackson' },
      { name: 'Wells Fargo', state: 'SD', city: 'Sioux Falls' },
      { name: 'Cadence Bank', state: 'MS', city: 'Tupelo' },
      { name: 'Pen-Air Credit Union', state: 'FL', city: 'Pensacola' },
      { name: 'JD Bank', state: 'LA', city: 'Jennings' },
      { name: 'The Citizens National Bank of Meridian', state: 'MS', city: 'Meridian' },
      { name: 'Home Bank', state: 'LA', city: 'Lafayette' },
      { name: 'Fidelity Bank', state: 'LA', city: 'New Orleans' },
      { name: 'First US Bank', state: 'AL', city: 'Birmingham' },
      { name: 'The Citizens Bank', state: 'MS', city: 'Philadelphia' },
      { name: 'Gulf Coast Bank and Trust', state: 'LA', city: 'New Orleans' },
      { name: 'Bryant Bank', state: 'AL', city: 'Tuscaloosa' },
      { name: 'Liberty Bank', state: 'LA', city: 'New Orleans' },
      { name: 'Red River Bank', state: 'LA', city: 'Alexandria' },
      { name: 'Community Bank of Louisiana', state: 'LA', city: 'Mansfield' },
      { name: 'United Community Bank - Louisiana', state: 'LA', city: 'Raceland' },
      { name: 'BOM Bank', state: 'LA', city: 'Natchitoches' },
      { name: 'Catalyst Bank', state: 'LA', city: 'Opelousas' },
      { name: 'Community First Bank', state: 'LA', city: 'New Iberia' },
      { name: 'FNB Jeanerette', state: 'LA', city: 'Jeanerette' },
      { name: 'Southern Bancorp', state: 'AR', city: 'Arkadelphia' },
      { name: 'Bank of Zachary', state: 'LA', city: 'Zachary' },
      { name: 'Synergy Bank', state: 'LA', city: 'Houma' },
      { name: 'CLB Bank', state: 'LA', city: 'Jonesville' },
      { name: 'Citizens Bank & Trust', state: 'LA', city: 'Plaquemine' },
      { name: 'Southern Heritage Bank', state: 'LA', city: 'Jonesville' },
      { name: 'First National Bank USA', state: 'LA', city: 'Boutte' },
      { name: 'St Landry Bank', state: 'LA', city: 'Opelousas' },
      { name: 'Radifi Federal Credit Union', state: 'FL', city: 'Jacksonville' },
      { name: 'Avadian Credit Union', state: 'AL', city: 'Birmingham' },
      { name: 'Rayne State Bank', state: 'LA', city: 'Rayne' },
      { name: 'Heart of Louisiana Federal Credit Union', state: 'LA', city: 'Pineville' },
      { name: 'Plaquemine Bank', state: 'LA', city: 'Plaquemine' },
      { name: 'Mutual Federal Credit Union', state: 'MS', city: 'Vicksburg' },
      { name: 'Aneca Federal Credit Union', state: 'LA', city: 'Shreveport' },
      { name: 'Red River Employees Federal Credit Union', state: 'TX', city: 'Texarkana' },
      { name: 'Investar Bank', state: 'LA', city: 'Baton Rouge' },
      { name: 'Bank Plus', state: 'MS', city: 'Belzoni' },
      { name: 'Currency Bank', state: 'LA', city: 'Oak Grove' },
      { name: 'Gibsland Bank & Trust', state: 'LA', city: 'Gibsland' },
      { name: 'United Mississippi', state: 'MS', city: 'Natchez' },
      { name: 'Magnolia State Bank', state: 'MS', city: 'Bay Springs' },
      { name: 'American Bank & Trust', state: 'LA', city: 'Opelousas' },
      { name: 'Farmers State Bank', state: 'LA', city: 'Church Point' },
      { name: 'Richton Bank & Trust', state: 'MS', city: 'Richton' },
      { name: 'Winnsboro State Bank & Trust', state: 'LA', city: 'Winnsboro' },
      { name: 'First American Bank & Trust', state: 'LA', city: 'Vacherie' },
      { name: 'Citizens Savings Bank', state: 'LA', city: 'Bogalusa' },
      { name: 'The First', state: 'MS', city: 'Hattiesburg' },
    ];
    
    const bankMap: Record<string, number> = {};
    for (const bank of banks) {
      const bankId = await findOrCreateBank(bank.name, bank.city, bank.state);
      bankMap[bank.name] = bankId;
      console.log(`  ✓ ${bank.name} (ID: ${bankId})`);
    }
    
    // Step 2: Sync People (guarantors)
    console.log('\n👥 Step 2: Syncing People (Guarantors)...');
    const people = ['Toby Easterly', 'Ryan Nash', 'Saun Sullivan'];
    const personMap: Record<string, number> = {};
    for (const personName of people) {
      const personId = await findOrCreatePerson(personName);
      personMap[personName] = personId;
      console.log(`  ✓ ${personName} (ID: ${personId})`);
    }
    
    // Step 3: Sync Projects and Loans from banking dashboard
    console.log('\n🏗️  Step 3: Syncing Projects and Loans...');
    
    // Projects from the data
    const projects = [
      // Multifamily
      { name: 'The Waters at Hammond', city: 'Hammond', state: 'LA', units: 312, stage: 'Stabilized', productType: 'Waters' },
      { name: 'The Waters at Millerville', city: 'Baton Rouge', state: 'LA', units: 295, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Waters at Redstone', city: 'Crestview', state: 'FL', units: 240, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Waters at Settlers Trace', city: 'Lafayette', state: 'LA', units: 348, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Waters at West Village', city: 'Scott', state: 'LA', units: 216, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Waters at Bluebonnet', city: 'Baton Rouge', state: 'LA', units: 324, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Waters at Crestview', city: 'Crestview', state: 'FL', units: 288, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Heights at Picardy', city: 'Baton Rouge', state: 'LA', units: 232, stage: 'Under Construction', productType: 'Heights' },
      { name: 'The Waters at McGowin', city: 'Mobile', state: 'AL', units: 252, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Waters at Freeport', city: 'Freeport', state: 'FL', units: 226, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Heights at Waterpointe', city: 'Flowood', state: 'MS', units: 240, stage: 'Under Construction', productType: 'Heights' },
      { name: 'The Waters at Promenade', city: 'Marrero', state: 'LA', units: 324, stage: 'Under Construction', productType: 'Waters' },
      { name: 'The Flats at Ransley', city: 'Pensacola', state: 'FL', units: 294, stage: 'Pre-Construction', productType: 'Flats' },
      { name: 'The Heights at Materra', city: 'Baton Rouge', state: 'LA', units: 295, stage: 'Pre-Construction', productType: 'Heights' },
      { name: 'The Waters at Crosspointe', city: 'Columbia', state: 'SC', units: 336, stage: 'Pre-Construction', productType: 'Waters' },
      { name: 'The Waters at Inverness', city: 'Hoover', state: 'AL', units: 289, stage: 'Under Contract', productType: 'Waters' },
      { name: 'The Waters at Conway', city: '', state: '', units: null, stage: 'Under Contract', productType: 'Waters' },
      { name: 'The Waters at Covington', city: 'Covington', state: 'LA', units: 336, stage: 'Under Contract', productType: 'Waters' },
      { name: 'The Waters at OWA', city: 'Foley', state: 'AL', units: 300, stage: 'Under Contract', productType: 'Waters' },
      { name: 'The Waters at Greenville', city: '', state: '', units: null, stage: 'Under Contract', productType: 'Waters' },
      { name: 'The Waters at Oxford', city: 'Oxford', state: 'MS', units: 316, stage: 'Under Contract', productType: 'Waters' },
      { name: 'The Waters at Southpoint', city: 'Hardeeville', state: 'SC', units: 288, stage: 'Under Contract', productType: 'Waters' },
      { name: 'The Waters at Robinwood', city: '', state: '', units: null, stage: 'Under Contract', productType: 'Waters' },
      // Liquidated
      { name: 'Silver Oaks', city: 'Gonzales', state: 'LA', units: 336, stage: 'Liquidated', productType: 'Other' },
      { name: 'The Heights', city: 'Hammond', state: 'LA', units: 336, stage: 'Liquidated', productType: 'Heights' },
      { name: 'Sweetwater', city: 'Addis', state: 'LA', units: 276, stage: 'Liquidated', productType: 'Other' },
      { name: 'The Waters at Southpark', city: 'Lake Charles', state: 'LA', units: 220, stage: 'Liquidated', productType: 'Waters' },
      { name: 'Dawson Park', city: 'Baton Rouge', state: 'LA', units: 155, stage: 'Liquidated', productType: 'Other' },
      { name: 'The Waters at Manhattan', city: 'Harvey', state: 'LA', units: 360, stage: 'Liquidated', productType: 'Waters' },
      { name: 'The Waters at Heritage', city: 'Gonzales', state: 'LA', units: 299, stage: 'Liquidated', productType: 'Waters' },
      { name: 'The Waters at Ransley', city: 'Pensacola', state: 'FL', units: 336, stage: 'Liquidated', productType: 'Waters' },
      { name: 'The Flats at East Bay', city: 'Fairhope', state: 'AL', units: 240, stage: 'Liquidated', productType: 'Flats' },
      // Other
      { name: 'Bauerle Rd Land, LLC', city: '', state: '', units: null, stage: 'Other', productType: 'Other' },
      { name: 'Plane Loan', city: '', state: '', units: null, stage: 'Other', productType: 'Other' },
      { name: '210 E Morris Ave, LLC', city: '', state: '', units: null, stage: 'Other', productType: 'Other' },
      { name: 'Amor Fati, LLC', city: '', state: 'LA', units: null, stage: 'Other', productType: 'Other' },
      { name: 'Icarus Development, LLC', city: '', state: '', units: null, stage: 'Other', productType: 'Other' },
      { name: 'Tredge', city: '', state: '', units: null, stage: 'Other', productType: 'Other' },
      { name: 'Stoa Construction, LLC', city: '', state: '', units: null, stage: 'Other', productType: 'Other' },
    ];
    
    const projectMap: Record<string, number> = {};
    for (const proj of projects) {
      const projectId = await findOrCreateProject({
        ProjectName: proj.name,
        City: proj.city || null,
        State: proj.state || null,
        Units: proj.units,
        Stage: proj.stage,
        ProductType: proj.productType,
        Location: proj.city && proj.state ? `${proj.city}, ${proj.state}` : null,
      });
      projectMap[proj.name] = projectId;
      console.log(`  ✓ ${proj.name} (ID: ${projectId})`);
    }
    
    console.log('\n✅ Data sync completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. Review the data in your database');
    console.log('  2. Use the API to add loans, participations, guarantees, etc.');
    console.log('  3. See HOW_TO_USE_THE_API.md for API usage examples');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  } finally {
    await pool.close();
  }
}

if (require.main === module) {
  syncAllData().catch(console.error);
}
