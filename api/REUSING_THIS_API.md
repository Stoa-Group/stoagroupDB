# Reusing This API in Other Projects

Yes! You can copy the entire `api/` folder to use in other projects. It's designed to be self-contained and portable.

---

## 📋 Quick Setup Steps

### 1. Copy the API Folder

```bash
# Copy the entire api/ folder to your new project
cp -r /path/to/stoagroupDB/api /path/to/new-project/
```

### 2. Install Dependencies

```bash
cd /path/to/new-project/api
npm install
```

### 3. Create `.env` File

Create a `.env` file in the `api/` folder with your database credentials:

```env
# Azure SQL Database Configuration
DB_SERVER=your-server.database.windows.net
DB_DATABASE=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS - Add your frontend/application URLs
CORS_ORIGINS=*
```

### 4. Build and Run

```bash
npm run build
npm start
```

That's it! Your API is ready to use.

---

## 🔧 What Gets Copied

The `api/` folder contains everything you need:

- ✅ **Source code** (`src/`) - All controllers, routes, middleware
- ✅ **Configuration** (`tsconfig.json`, `package.json`)
- ✅ **Database connection** (`src/config/database.ts`)
- ✅ **Scripts** (`scripts/`) - Database manipulation utilities
- ✅ **Documentation** - README, setup guides

---

## 🎯 What You Need to Configure

### Required:
1. **Database credentials** - Update `.env` with your database connection
2. **Port** - Change `PORT` in `.env` if needed (default: 3000)
3. **CORS** - Update `CORS_ORIGINS` with your frontend URLs

### Optional:
- **Routes** - Modify `src/routes/` if you need different endpoints
- **Controllers** - Update `src/controllers/` for different business logic
- **Database schema** - The API assumes your database has the same schema (core, banking, pipeline schemas)

---

## 📦 Standalone Usage

The API can run completely standalone:

```bash
cd api
npm install
# Create .env file
npm run build
npm start
```

It doesn't need anything from the parent `stoagroupDB/` folder.

---

## 🔄 Using with Different Database Schemas

If your database has a different schema:

1. **Update controllers** (`src/controllers/`) to match your tables
2. **Update routes** (`src/routes/`) if needed
3. **Keep the same structure** - The pattern is the same:
   - Controllers handle business logic
   - Routes define endpoints
   - Database config handles connections

---

## 🌐 Deploying the Copied API

You can deploy the copied API to:
- **Render** - Same process as the original
- **Azure App Service** - Deploy the `api/` folder
- **Heroku** - Standard Node.js deployment
- **Docker** - Use the included Dockerfile

Just make sure to:
1. Set environment variables in your hosting platform
2. Update CORS_ORIGINS for your domain
3. Configure firewall rules for your database

---

## 💡 Example: Using in a New Project

```bash
# 1. Copy API
cp -r ~/stoagroupDB/api ~/my-new-project/

# 2. Navigate to API
cd ~/my-new-project/api

# 3. Install dependencies
npm install

# 4. Create .env
cat > .env << EOF
DB_SERVER=my-db.database.windows.net
DB_DATABASE=mydatabase
DB_USER=myuser
DB_PASSWORD=mypassword
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://myapp.com
EOF

# 5. Build and start
npm run build
npm start
```

---

## ✅ Checklist

When copying to a new project:

- [ ] Copied entire `api/` folder
- [ ] Ran `npm install` in the new location
- [ ] Created `.env` file with correct database credentials
- [ ] Updated `PORT` if needed
- [ ] Updated `CORS_ORIGINS` for your frontend
- [ ] Tested connection: `npm run db:test`
- [ ] Built the project: `npm run build`
- [ ] Started the server: `npm start`

---

## 🎯 Key Points

- **Self-contained** - Everything needed is in the `api/` folder
- **Portable** - Can be copied anywhere
- **Configurable** - Just update `.env` for different databases
- **Reusable** - Same code, different databases/projects
- **Production-ready** - Includes error handling, security, etc.

---

## 📚 Related Files

- `README.md` - API documentation
- `SETUP_GUIDE.md` - Detailed setup instructions
- `DEPLOYMENT_GUIDE.md` - How to deploy
- `scripts/README.md` - Database manipulation utilities

---

**The API is designed to be reusable!** Just copy, configure, and deploy. 🚀
