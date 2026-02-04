# Sharing api-client.js Across Repos

This repo is the **single source of truth** for `api-client.js`. Other repos get it via a **GitHub Action** (auto-sync) or optionally via npm/submodule.

---

## Auto-sync via GitHub Action (active)

When you push changes to **api-client.js** on **main**, a workflow runs and updates the file in:

- **Land-Development-Pipeline**
- **banking-dashboard**
- **leasing-analytics-hub**

**One-time setup:** In this repo (stoagroupDB) go to **Settings → Secrets and variables → Actions**. Add a secret:

- **Name:** `REPO_ACCESS_TOKEN`
- **Value:** A GitHub Personal Access Token (or fine-grained token) with **push** access to the three repos above.

Create a PAT at GitHub → Settings → Developer settings → Personal access tokens. Give it `repo` scope (or restrict to just those three repos with a fine-grained token). Then add it as `REPO_ACCESS_TOKEN` in stoagroupDB’s Actions secrets.

The workflow file is `.github/workflows/sync-api-client.yml`. It copies `api-client.js` to the **root** of each target repo. If a repo keeps the file in a subfolder (e.g. `public/api-client.js`), edit the workflow for that step.

---

## Option 1: npm install from this repo

Other repos install the client as a dependency from GitHub. When you push to `main`, they get updates by running `npm update`.

### In this repo (stoagroupDB)

A root `package.json` exists with `"main": "api-client.js"` so the repo is installable as a package.

### In each other repo (e.g. dashboard, Domo scripts)

1. Add the dependency:

   ```json
   "dependencies": {
     "stoagroup-api-client": "github:Stoa-Group/stoagroupDB#main"
   }
   ```

2. Install: `npm install`

3. Use the client:
   - **Node / build tools:**  
     `const API = require('stoagroup-api-client');`  
     or copy the file in a build step from `node_modules/stoagroup-api-client/api-client.js`.
   - **Browser / Domo:**  
     Copy the file once from `node_modules/stoagroup-api-client/api-client.js` into your app (e.g. script asset), or serve that path if your app bundles from node_modules.

4. To pull the latest after you push here:  
   `npm update stoagroup-api-client`

**Result:** You only maintain the client in stoagroupDB. Others run `npm update` when they want the latest.

---

## Option 2: Git submodule

Other repos add this repo as a submodule and point at `api-client.js` inside it.

### In each other repo

```bash
git submodule add https://github.com/Stoa-Group/stoagroupDB.git lib/stoagroupDB
```

Use the file at `lib/stoagroupDB/api-client.js` (script tag, copy, or bundle from that path).

To get the latest after you push here:

```bash
git submodule update --remote lib/stoagroupDB
git add lib/stoagroupDB
git commit -m "Update API client from stoagroupDB"
```

**Result:** No npm; they just pull the submodule when they want the latest.

---

## Option 3: Auto-sync to other repos (CI)

“Push here → file appears in other repos” with no extra steps in those repos.

A GitHub Action in **this** repo runs on push (e.g. when `api-client.js` changes), and for each target repo it:

- checks out that repo,
- copies `api-client.js` into a known path (e.g. `lib/api-client.js` or `public/api-client.js`),
- commits and pushes (or opens a PR).

You need:

- A list of repo URLs (e.g. `Stoa-Group/dashboard`, `Stoa-Group/domo-scripts`).
- A GitHub token with write access to those repos (e.g. a PAT or fine-grained token), stored as a secret.

If you want this, we can add a workflow template (e.g. `.github/workflows/sync-api-client.yml`) that you fill in with repo list and secret name.

---

## Summary

| Option              | “Push here” → others get it | Effort in other repos      |
|---------------------|-----------------------------|----------------------------|
| npm from GitHub     | When they run `npm update`  | Add dependency, use file   |
| Git submodule       | When they run submodule update | Add submodule, use path  |
| CI sync             | Automatically (commit in their repo) | One-time setup + token |

Recommendation: use **Option 1** (npm from this repo) so every repo depends on one place; pin to a tag (e.g. `#v1.2.0`) when you want to lock versions.
