# API Setup and Usage Guide

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `api` folder:

**Based on your ODBC connection string, use these values:**

```env
# Azure SQL Database Configuration
# Converted from ODBC: Driver={ODBC Driver 18 for SQL Server};Server=tcp:stoagroupdb.database.windows.net,1433;Database=stoagroupDB;Uid=arovner;Pwd={your_password_here};Encrypt=yes;TrustServerCertificate=no;

DB_SERVER=stoagroupdb.database.windows.net
DB_DATABASE=stoagroupDB
DB_USER=arovner
DB_PASSWORD=your_password_here
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS - Add your Domo/application URLs (comma-separated)
# For local development, use: CORS_ORIGINS=*
# For production, add specific URLs: CORS_ORIGINS=https://your-domo-instance.domo.com,https://your-app.com
CORS_ORIGINS=*
```

**Important:** Replace `your_password_here` with your actual database password!

### 3. Build and Start

```bash
# Build TypeScript
npm run build

# Start the server
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The API will be running at `http://localhost:3000` (or your configured PORT)

---

## 📝 How to Write to the Database

### Option 1: Using cURL (Command Line)

#### Create a Project
```bash
curl -X POST http://localhost:3000/api/core/projects \
  -H "Content-Type: application/json" \
  -d '{
    "ProjectName": "The Heights at Picardy",
    "City": "Baton Rouge",
    "State": "LA",
    "Region": "Gulf Coast",
    "Location": "Baton Rouge, LA",
    "Units": 232,
    "ProductType": "Heights",
    "Stage": "Started"
  }'
```

#### Update a Project
```bash
curl -X PUT http://localhost:3000/api/core/projects/1 \
  -H "Content-Type: application/json" \
  -d '{
    "ProjectName": "The Heights at Picardy",
    "Units": 240,
    "Stage": "Stabilized"
  }'
```

#### Create a Loan
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
    "MaturityDate": "2025-12-31",
    "FixedOrFloating": "Floating",
    "IndexName": "SOFR",
    "Spread": "2.75%"
  }'
```

#### Update a Loan
```bash
curl -X PUT http://localhost:3000/api/banking/loans/10 \
  -H "Content-Type: application/json" \
  -d '{
    "LoanAmount": 16000000,
    "MaturityDate": "2026-12-31"
  }'
```

---

### Option 2: Using JavaScript/TypeScript (Node.js or Browser)

```javascript
// Create a project
async function createProject() {
  const response = await fetch('http://localhost:3000/api/core/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ProjectName: "The Heights at Picardy",
      City: "Baton Rouge",
      State: "LA",
      Region: "Gulf Coast",
      Location: "Baton Rouge, LA",
      Units: 232,
      ProductType: "Heights",
      Stage: "Started"
    })
  });
  
  const result = await response.json();
  console.log(result);
}

// Update a project
async function updateProject(projectId) {
  const response = await fetch(`http://localhost:3000/api/core/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Units: 240,
      Stage: "Stabilized"
    })
  });
  
  const result = await response.json();
  console.log(result);
}
```

---

### Option 3: Using Domo (Webhook/API Connector)

#### In Domo, you can:

1. **Use Domo's API Connector** to send data to your API endpoint
2. **Create a DataFlow** that triggers on dataset updates
3. **Use Domo's Webhook capabilities** to push changes

#### Example Domo DataFlow Configuration:

1. Go to DataFlows in Domo
2. Create a new DataFlow
3. Add your dataset as input
4. Add a "Custom Script" or "API" output
5. Configure it to POST/PUT to your API endpoint

#### Example Domo API Call (in Custom Script):

```javascript
// Domo DataFlow Custom Script
const apiUrl = 'https://your-api-server.com/api/core/projects';
const projectData = {
  ProjectName: DomoData[0].ProjectName,
  City: DomoData[0].City,
  State: DomoData[0].State,
  Units: DomoData[0].Units,
  // ... other fields
};

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(projectData)
});

const result = await response.json();
return result;
```

---

### Option 4: Using Postman or Similar Tools

1. Create a new request
2. Set method to `POST` or `PUT`
3. Set URL: `http://localhost:3000/api/core/projects` (or your endpoint)
4. In Headers, add: `Content-Type: application/json`
5. In Body, select "raw" and "JSON", then paste:
```json
{
  "ProjectName": "The Heights at Picardy",
  "City": "Baton Rouge",
  "State": "LA",
  "Units": 232
}
```

---

## 🔑 Key Points

### Request Format
- **Method**: `POST` (create) or `PUT` (update)
- **Headers**: `Content-Type: application/json`
- **Body**: JSON object with the fields you want to set

### Response Format

**Success (200/201):**
```json
{
  "success": true,
  "data": {
    "ProjectId": 1,
    "ProjectName": "The Heights at Picardy",
    ...
  }
}
```

**Error (400/404/409):**
```json
{
  "success": false,
  "error": {
    "message": "Error description here"
  }
}
```

### For PUT (Update) Requests:
- Include the ID in the URL: `/api/core/projects/:id`
- Only include fields you want to update (partial updates are supported)
- Fields not included will remain unchanged

### For POST (Create) Requests:
- Include all required fields (see schema for required fields)
- The API will return the created record with its new ID

---

## 🌐 Deploying the API

### Option 1: Azure App Service
1. Create an Azure App Service
2. Deploy your code (via Git, VS Code, or Azure CLI)
3. Set environment variables in Azure Portal
4. Your API will be available at `https://your-app.azurewebsites.net`

### Option 2: Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Option 3: Heroku/AWS/Other
- Standard Node.js deployment
- Set environment variables in your hosting platform
- Point your domain to the deployed API

---

## 🔍 Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### API Documentation
```bash
curl http://localhost:3000/api
```

---

## 📋 Common Endpoints Reference

### Core
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

See `/api` endpoint for complete list.

---

## 🛠️ Troubleshooting

### Connection Issues
- Check your `.env` file has correct database credentials
- Verify Azure SQL Database firewall allows your server's IP
- Test database connection: `npm run dev` and check console

### CORS Errors
- Add your frontend/Domo URL to `CORS_ORIGINS` in `.env`
- Restart the server after changing `.env`

### Validation Errors
- Check required fields are included
- Verify data types match schema (dates as strings, numbers as numbers)
- Check foreign key references exist (e.g., ProjectId must exist)

