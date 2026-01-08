# Quick Start - Using the API for Edits

## 🎯 Goal
Use the REST API to create and update records in your database instead of writing SQL directly.

---

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd api
npm install
```

### Step 2: Create `.env` File
Copy the example and fill in your password:

```bash
cp .env.example .env
```

Then edit `.env` and replace `your_password_here` with your actual database password.

**Your `.env` should look like:**
```env
DB_SERVER=stoagroupdb.database.windows.net
DB_DATABASE=stoagroupDB
DB_USER=arovner
DB_PASSWORD=YOUR_ACTUAL_PASSWORD_HERE
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
PORT=3000
NODE_ENV=development
CORS_ORIGINS=*
```

### Step 3: Build and Start
```bash
npm run build
npm start
```

The API will be running at `http://localhost:3000`

---

## 📝 Making Edits via API

### Example 1: Update a Project
```bash
curl -X PUT http://localhost:3000/api/core/projects/1 \
  -H "Content-Type: application/json" \
  -d '{
    "Units": 250,
    "Stage": "Stabilized"
  }'
```

### Example 2: Create a New Loan
```bash
curl -X POST http://localhost:3000/api/banking/loans \
  -H "Content-Type: application/json" \
  -d '{
    "ProjectId": 1,
    "LoanPhase": "Construction",
    "LoanType": "LOC - Construction",
    "LenderId": 5,
    "LoanAmount": 15000000,
    "LoanClosingDate": "2024-01-15",
    "MaturityDate": "2025-12-31"
  }'
```

### Example 3: Update a Loan
```bash
curl -X PUT http://localhost:3000/api/banking/loans/10 \
  -H "Content-Type: application/json" \
  -d '{
    "LoanAmount": 16000000,
    "MaturityDate": "2026-12-31"
  }'
```

---

## 🌐 Using from Domo

### Option 1: Domo DataFlow with API Connector
1. In Domo, go to **DataFlows**
2. Create a new DataFlow
3. Add your dataset as input
4. Add **"API"** or **"Custom Script"** output
5. Configure to POST/PUT to: `https://your-api-url.com/api/core/projects`

### Option 2: Domo Magic ETL Custom Script
```javascript
// In Domo Magic ETL Custom Script step
const apiUrl = 'https://your-api-url.com/api/core/projects';
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ProjectName: input.ProjectName,
    City: input.City,
    State: input.State,
    Units: input.Units
  })
});
return await response.json();
```

---

## 🔍 Test Your API

### Health Check
```bash
curl http://localhost:3000/health
```

### View All Endpoints
```bash
curl http://localhost:3000/api
```

---

## 📋 Common Endpoints

### Core Entities
- `POST /api/core/projects` - Create project
- `PUT /api/core/projects/:id` - Update project
- `POST /api/core/banks` - Create bank
- `PUT /api/core/banks/:id` - Update bank

### Banking
- `POST /api/banking/loans` - Create loan
- `PUT /api/banking/loans/:id` - Update loan
- `POST /api/banking/participations` - Create participation
- `PUT /api/banking/participations/:id` - Update participation

### Pipeline
- `POST /api/pipeline/under-contracts` - Create under contract
- `PUT /api/pipeline/under-contracts/:id` - Update under contract

**See full list:** `GET http://localhost:3000/api`

---

## 🚀 Deploy to Production

Once your API is working locally, deploy it to:
- **Azure App Service** (recommended - same region as your database)
- **Heroku**
- **AWS Lambda**
- **Docker container**

Then update Domo to use your production API URL instead of `localhost:3000`.

---

## 💡 Key Differences: ODBC vs API

| ODBC Connection String | API Environment Variables |
|------------------------|---------------------------|
| Used by Domo to **READ** data | Used by API to **WRITE** data |
| `Driver={ODBC Driver 18...}` | `DB_SERVER=...` |
| `Server=tcp:stoagroupdb...` | `DB_SERVER=stoagroupdb...` |
| `Uid=arovner` | `DB_USER=arovner` |
| `Pwd={password}` | `DB_PASSWORD=...` |
| `Encrypt=yes` | `DB_ENCRYPT=true` |
| `TrustServerCertificate=no` | `DB_TRUST_SERVER_CERTIFICATE=false` |

**Use ODBC for:** Domo DataSets (reading data)  
**Use API for:** Making edits/updates (writing data)
