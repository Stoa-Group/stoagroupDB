# Where to Run Your API

## 🎯 Quick Answer

**Yes, you need to run the API somewhere!** Here are your options:

---

## Option 1: Run Locally (For Testing)

**When to use:** Testing, development, or quick edits from your computer

**How to run:**
```bash
cd api
npm install
npm run build
npm start
```

**Access:** `http://localhost:3000`

**Pros:**
- ✅ Free
- ✅ Easy to test
- ✅ Quick setup

**Cons:**
- ❌ Only works when your computer is on
- ❌ Can't use from Domo (Domo can't reach `localhost`)
- ❌ Not accessible from other devices

---

## Option 2: Deploy to Azure App Service (Recommended)

**When to use:** Production use, especially with Domo

**Why Azure?**
- Your database is already on Azure
- Easy integration
- Always running (24/7)
- Secure and reliable

### Quick Deployment Steps:

1. **Create Azure App Service:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create new resource → "Web App"
   - Choose Node.js runtime
   - Select same region as your database

2. **Deploy Your Code:**
   - Option A: Deploy from VS Code (Azure extension)
   - Option B: Deploy from Git (GitHub, Azure DevOps)
   - Option C: Use Azure CLI

3. **Set Environment Variables:**
   In Azure Portal → Your App Service → Configuration → Application settings:
   ```
   DB_SERVER=stoagroupdb.database.windows.net
   DB_DATABASE=stoagroupDB
   DB_USER=arovner
   DB_PASSWORD=your_password
   DB_ENCRYPT=true
   DB_TRUST_SERVER_CERTIFICATE=false
   NODE_ENV=production
   CORS_ORIGINS=https://your-domo-instance.domo.com
   ```

4. **Your API URL:** `https://your-app-name.azurewebsites.net`

**Cost:** ~$13-55/month (depending on plan)

---

## Option 3: Deploy to Render ⭐ (Easiest!)

**When to use:** Best balance of simplicity and features. Great free tier!

**Why Render?**
- ✅ Simple web interface (no CLI needed)
- ✅ Free tier that stays awake (unlike Heroku)
- ✅ Automatic HTTPS
- ✅ Auto-deploys from Git
- ✅ Easy environment variable management

### Quick Steps:

1. **Go to [render.com](https://render.com)** and sign up
2. **Connect your Git repository** (GitHub, GitLab, etc.)
3. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Select your repository
   - Set **Root Directory:** `api` (if your code is in the `api` folder)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. **Add Environment Variables** in Render dashboard:
   ```
   DB_SERVER=stoagroupdb.database.windows.net
   DB_DATABASE=stoagroupDB
   DB_USER=arovner
   DB_PASSWORD=your_password
   DB_ENCRYPT=true
   DB_TRUST_SERVER_CERTIFICATE=false
   NODE_ENV=production
   CORS_ORIGINS=*
   ```
5. **Deploy!** Render does the rest automatically.

**Your API URL:** `https://your-app.onrender.com`

**Cost:** Free tier available (750 hours/month), or $7/month for better performance

**See detailed guide:** `RENDER_DEPLOYMENT.md`

---

## Option 4: Deploy to Heroku

**When to use:** Quick deployment, free tier available

### Steps:

1. **Install Heroku CLI:**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   ```

2. **Login and Create App:**
   ```bash
   heroku login
   heroku create stoagroup-api
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set DB_SERVER=stoagroupdb.database.windows.net
   heroku config:set DB_DATABASE=stoagroupDB
   heroku config:set DB_USER=arovner
   heroku config:set DB_PASSWORD=your_password
   heroku config:set DB_ENCRYPT=true
   heroku config:set DB_TRUST_SERVER_CERTIFICATE=false
   heroku config:set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

**Your API URL:** `https://stoagroup-api.herokuapp.com`

**Cost:** Free tier available (with limitations), or $7+/month

---

## Option 5: Run on Your Own Server/VPS

**When to use:** You have a server or VPS already

**Steps:**
1. Install Node.js on your server
2. Copy your API code
3. Set up `.env` file
4. Use PM2 or systemd to keep it running:
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name stoagroup-api
   pm2 save
   pm2 startup
   ```

---

## 🚀 Recommended Options

**For easiest setup:** **Render** ⭐
- Simple web interface
- Free tier that stays awake
- Auto-deploys from Git
- See `RENDER_DEPLOYMENT.md` for detailed steps

**For Azure integration:** **Azure App Service**
- Same network/region as your database = faster connections
- Easy to manage in Azure Portal
- Integrated with your existing Azure resources

---

## 📋 Quick Comparison

| Option | Cost | Always On? | Domo Compatible? | Difficulty |
|--------|------|------------|------------------|------------|
| **Local** | Free | ❌ No | ❌ No | ⭐ Easy |
| **Render** ⭐ | Free-$7+/mo | ✅ Yes | ✅ Yes | ⭐⭐ Easy |
| **Azure App Service** | ~$13-55/mo | ✅ Yes | ✅ Yes | ⭐⭐ Medium |
| **Heroku** | Free-$7+/mo | ✅ Yes* | ✅ Yes | ⭐⭐ Medium |
| **Your Server** | Varies | ✅ If configured | ✅ Yes | ⭐⭐⭐ Harder |

*Heroku free tier sleeps after inactivity

---

## 🔧 For Now: Start Local

**To test the API right now:**

```bash
cd api
npm install
# Create .env file with your database credentials
npm run build
npm start
```

Then test it:
```bash
curl http://localhost:3000/health
```

**When you're ready for production:** Deploy to Render (see Option 3 above) - it's the easiest!

---

## 💡 Pro Tip

You can run it locally for testing, then deploy to Azure when you're ready to use it with Domo. The code is the same - just the URL changes!

- **Local:** `http://localhost:3000`
- **Render:** `https://your-app.onrender.com`
- **Azure:** `https://your-app.azurewebsites.net`
