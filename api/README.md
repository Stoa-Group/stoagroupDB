# Stoa Group Database REST API

A comprehensive REST API for managing the Stoa Group real estate portfolio and banking database.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Azure SQL Database access credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your Azure SQL Database credentials:
```env
DB_SERVER=your-server.database.windows.net
DB_DATABASE=stoagroupDB
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
```

3. Build TypeScript:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 📚 API Endpoints

**Note:** This API provides write operations only (POST and PUT). Domo handles all GET operations directly from the database.

### Core Entities

#### Projects
- `POST /api/core/projects` - Create new project
- `PUT /api/core/projects/:id` - Update project

#### Banks
- `POST /api/core/banks` - Create new bank
- `PUT /api/core/banks/:id` - Update bank

#### Persons
- `POST /api/core/persons` - Create new person
- `PUT /api/core/persons/:id` - Update person

#### Equity Partners
- `POST /api/core/equity-partners` - Create new equity partner
- `PUT /api/core/equity-partners/:id` - Update equity partner

### Banking

#### Loans
- `POST /api/banking/loans` - Create new loan
- `PUT /api/banking/loans/:id` - Update loan

#### DSCR Tests
- `POST /api/banking/dscr-tests` - Create new DSCR test
- `PUT /api/banking/dscr-tests/:id` - Update DSCR test

#### Participations
- `POST /api/banking/participations` - Create new participation
- `PUT /api/banking/participations/:id` - Update participation

#### Guarantees
- `POST /api/banking/guarantees` - Create new guarantee
- `PUT /api/banking/guarantees/:id` - Update guarantee

#### Covenants
- `POST /api/banking/covenants` - Create new covenant
- `PUT /api/banking/covenants/:id` - Update covenant

#### Liquidity Requirements
- `POST /api/banking/liquidity-requirements` - Create new liquidity requirement
- `PUT /api/banking/liquidity-requirements/:id` - Update liquidity requirement

#### Bank Targets
- `POST /api/banking/bank-targets` - Create new bank target
- `PUT /api/banking/bank-targets/:id` - Update bank target

#### Equity Commitments
- `POST /api/banking/equity-commitments` - Create new equity commitment
- `PUT /api/banking/equity-commitments/:id` - Update equity commitment

### Pipeline

#### Under Contracts
- `POST /api/pipeline/under-contracts` - Create new under contract
- `PUT /api/pipeline/under-contracts/:id` - Update under contract

#### Commercial Listed
- `POST /api/pipeline/commercial-listed` - Create new commercial listed
- `PUT /api/pipeline/commercial-listed/:id` - Update commercial listed

#### Commercial Acreage
- `POST /api/pipeline/commercial-acreage` - Create new commercial acreage
- `PUT /api/pipeline/commercial-acreage/:id` - Update commercial acreage

#### Closed Properties
- `POST /api/pipeline/closed-properties` - Create new closed property
- `PUT /api/pipeline/closed-properties/:id` - Update closed property

## 📝 Request/Response Format

All requests should use `Content-Type: application/json`.

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message here"
  }
}
```

## 🔍 Example Requests

### Create a Project
```bash
POST /api/core/projects
Content-Type: application/json

{
  "ProjectName": "The Heights at Picardy",
  "City": "Baton Rouge",
  "State": "LA",
  "Region": "Gulf Coast",
  "Location": "Baton Rouge, LA",
  "Units": 232,
  "ProductType": "Heights",
  "Stage": "Started"
}
```

### Update a Project
```bash
PUT /api/core/projects/1
Content-Type: application/json

{
  "ProjectName": "The Heights at Picardy",
  "Units": 240,
  "Stage": "Stabilized"
}
```

### Create a Loan
```bash
POST /api/banking/loans
Content-Type: application/json

{
  "ProjectId": 1,
  "LoanPhase": "Construction",
  "LoanAmount": 15000000,
  "LoanClosingDate": "2024-01-15",
  "MaturityDate": "2025-12-31"
}
```

### Update a Loan
```bash
PUT /api/banking/loans/5
Content-Type: application/json

{
  "LoanAmount": 16000000,
  "MaturityDate": "2026-12-31"
}
```

## 🏥 Health Check

```bash
GET /health
```

Returns the API status and database connection status.

## 📖 API Documentation

```bash
GET /api
```

Returns a complete list of all available endpoints.

## 🔒 Security

- All database queries use parameterized statements to prevent SQL injection
- CORS is configurable via environment variables
- Helmet.js is used for security headers
- Input validation is performed on all requests

## 🛠️ Development

- TypeScript for type safety
- Express.js for routing
- mssql for Azure SQL Database connectivity
- Error handling middleware for consistent error responses

## 📦 Deployment

1. Set environment variables in your hosting platform
2. Build the project: `npm run build`
3. Start the server: `npm start`

The API is ready to be deployed to platforms like:
- Azure App Service
- Heroku
- AWS Lambda (with serverless framework)
- Docker containers

