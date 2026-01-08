# Data Sync Status

## ✅ What's Already in the Database

Based on your queries, you have:

### Core Data
- ✅ **32 Projects** - All projects created
- ✅ **57 Banks** - All banks created  
- ✅ **3 People** - Toby Easterly, Ryan Nash, Saun Sullivan

### Banking Data
- ✅ **57 Loans** - Mix of Construction and Permanent loans
- ✅ **76 Participations** - Bank participation splits

### Still Need to Add
- ⏳ **Guarantees** - Contingent liabilities (check with: `SELECT COUNT(*) FROM banking.Guarantee`)
- ⏳ **DSCR Tests** - 1st, 2nd, 3rd test dates (check with: `SELECT COUNT(*) FROM banking.DSCRTest`)
- ⏳ **Covenants** - Occupancy and other requirements (check with: `SELECT COUNT(*) FROM banking.Covenant`)
- ⏳ **Liquidity Requirements** - Total and lending bank amounts (check with: `SELECT COUNT(*) FROM banking.LiquidityRequirement`)
- ⏳ **Bank Targets** - Relationship and exposure data (check with: `SELECT COUNT(*) FROM banking.BankTarget`)

---

## 🔍 Quick Status Check

Run these queries to see what's missing:

```bash
cd api

# Check guarantees
npm run db:query "SELECT COUNT(*) as total FROM banking.Guarantee"

# Check DSCR tests
npm run db:query "SELECT COUNT(*) as total FROM banking.DSCRTest"

# Check covenants
npm run db:query "SELECT COUNT(*) as total FROM banking.Covenant"

# Check liquidity requirements
npm run db:query "SELECT COUNT(*) as total FROM banking.LiquidityRequirement"

# Check bank targets
npm run db:query "SELECT COUNT(*) as total FROM banking.BankTarget"
```

---

## 📊 Expected Data Counts

Based on your spreadsheets, you should have approximately:

- **Guarantees**: ~40-50 (3 guarantors × ~15 active projects)
- **DSCR Tests**: ~20-30 (many projects have 1-3 tests)
- **Covenants**: ~10-15 (occupancy covenants, etc.)
- **Liquidity Requirements**: ~15-20 (one per active project)
- **Bank Targets**: ~100+ (all the banks in your targeted banks list)

---

## 🚀 How to Add Missing Data

### Option 1: Use the API

The API is live at: `https://stoagroupdb.onrender.com`

See `HOW_TO_USE_THE_API.md` for examples.

### Option 2: Use Direct SQL

```bash
cd api

# Example: Add a guarantee
npm run db:exec "INSERT INTO banking.Guarantee (ProjectId, PersonId, GuaranteePercent, GuaranteeAmount) VALUES (1, 1, 100, 45337)"

# Example: Add a DSCR test
npm run db:exec "INSERT INTO banking.DSCRTest (ProjectId, TestNumber, TestDate, Requirement, ProjectedValue) VALUES (1, 1, '2025-09-30', 1.00, '0.41')"
```

### Option 3: Expand the Sync Script

The script `api/scripts/sync-loans-data.ts` has an example. You can expand it with all your data.

---

## ✅ API Testing

To test the API, try:

```bash
# Health check
curl https://stoagroupdb.onrender.com/api/health

# Get projects
curl https://stoagroupdb.onrender.com/api/core/projects

# Get loans
curl https://stoagroupdb.onrender.com/api/banking/loans

# Get participations
curl https://stoagroupdb.onrender.com/api/banking/participations
```

---

## 📝 Next Steps

1. **Check what's missing** - Run the status check queries above
2. **Add guarantees** - Use API or SQL to add contingent liabilities
3. **Add DSCR tests** - Add 1st, 2nd, 3rd test data
4. **Add covenants** - Add occupancy and other requirements
5. **Add liquidity requirements** - Add total and lending bank amounts
6. **Add bank targets** - Add relationship and exposure data

---

**Your API is live and working!** 🎉
