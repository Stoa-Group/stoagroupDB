# Using Your Render API

Once your API is deployed on Render, here's how to use it.

---

## 🎯 Your Render API URL

**Your API is live at:**
```
https://stoagroupdb.onrender.com
```

✅ **Deployed and ready to use!**

---

## 📝 Local `.env` File (For Local Development Only)

Your **local `.env`** file is ONLY for running the API on your computer. It's separate from Render.

**In `api/.env` (local development):**
```env
# For running API locally on your computer
DB_SERVER=stoagroupdb.database.windows.net
DB_DATABASE=stoagroupDB
DB_USER=arovner
DB_PASSWORD=your_password_here
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
PORT=3000
NODE_ENV=development
CORS_ORIGINS=*
```

**This is ONLY used when you run:**
```bash
cd api
npm start
# API runs at http://localhost:3000
```

---

## 🌐 Render Environment Variables (Already Set)

Render has its own environment variables (you already set these):
- ✅ `DB_SERVER`
- ✅ `DB_DATABASE`
- ✅ `DB_USER`
- ✅ `DB_PASSWORD`
- ✅ etc.

**You don't need to do anything else with Render's env vars** - they're already configured!

---

## 🔗 How to Use Your Render API

### Option 1: Use in Domo

In Domo DataFlows or Magic ETL, use your Render API URL:

```javascript
// In Domo Custom Script
const apiUrl = 'https://stoagroupdb.onrender.com/api/core/projects';

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

### Option 2: Test from Command Line

```bash
# Health check
curl https://stoagroupdb.onrender.com/health

# Create a project
curl -X POST https://stoagroupdb.onrender.com/api/core/projects \
  -H "Content-Type: application/json" \
  -d '{
    "ProjectName": "Test Project",
    "City": "Baton Rouge",
    "State": "LA",
    "Units": 100
  }'
```

### Option 3: Use in Postman or Browser

- **Health Check:** `https://stoagroupdb.onrender.com/health`
- **API Docs:** `https://stoagroupdb.onrender.com/api`
- **Create Project:** `POST https://stoagroupdb.onrender.com/api/core/projects`

---

## 📋 Summary

| Location | Purpose | What to Put |
|----------|----------|-------------|
| **Render Dashboard** | API running on Render | Environment variables (already done ✅) |
| **Local `api/.env`** | Running API on your computer | Database connection for local dev |
| **Domo/Other Apps** | Calling the Render API | Use Render URL: `https://your-app.onrender.com` |

---

## ✅ Quick Checklist

- [x] Render has environment variables set
- [ ] Get your Render API URL from Render dashboard
- [ ] Test it: `curl https://your-app.onrender.com/health`
- [ ] Use the URL in Domo or other applications
- [ ] Local `.env` is only for local development

---

## 🎯 Next Steps

1. **Get your Render URL** from the Render dashboard
2. **Test it** with a health check
3. **Use it in Domo** - replace `localhost:3000` with your Render URL
4. **Keep local `.env`** for when you want to run the API on your computer

---

## 💡 Remember

- **Render API** = Production (always running) → Use Render URL
- **Local API** = Development (only when you run it) → Use `localhost:3000`

You can have both! Use Render for production/Domo, and local for testing.
