# Deal Pipeline Attachments – Backend

Backend behavior and fixes for deal pipeline file attachments (list, upload, download, delete).

---

## Endpoints

| Action   | Method | Path |
|----------|--------|------|
| List     | GET    | `/api/pipeline/deal-pipeline/:id/attachments` |
| Upload   | POST   | `/api/pipeline/deal-pipeline/:id/attachments` (multipart `file`, max 200MB) |
| Download | GET    | `/api/pipeline/deal-pipeline/attachments/:attachmentId/download` |
| Delete   | DELETE | `/api/pipeline/deal-pipeline/attachments/:attachmentId` |

---

## "crypto is not defined" on View/Download

**Symptom:** When a client calls the download endpoint (View or Download a file), the server responds with an error that includes **"crypto is not defined"**.

**Cause:** The server is using Node’s `crypto` (e.g. for hashing or signing) somewhere in the request chain without loading it. In Node there is **no global `crypto`** like in the browser; the built-in must be loaded explicitly.

**Fix (backend):** Ensure the Node.js `crypto` module is loaded before any code that serves or signs file URLs runs.

1. **At app startup (recommended):** In your server entry point (e.g. `server.ts` or `app.js`), load crypto first:
   - **CommonJS:** `require('crypto');`
   - **ESM / TypeScript:** `import 'crypto';`
   That way crypto is available for the whole process (including dependencies like the Azure Blob SDK).

2. **In the download handler file:** In the file that handles `GET /api/pipeline/deal-pipeline/attachments/:id/download`, also load crypto at the top:
   - **CommonJS:** `const crypto = require('crypto');`
   - **ESM / TypeScript:** `import crypto from 'crypto';`

Use `crypto` only after it has been required/imported. Once that’s in place, View/Download should stop returning "crypto is not defined".

**In this repo:** The server entry point (`api/src/server.ts`) has `import 'crypto'` at the top so the module is loaded at startup. The pipeline controller also has `import crypto from 'crypto'` where the download route is implemented.

---

## Frontend behavior when the error occurs

When the server returns "crypto is not defined", the app can show that message plus a short note that it’s a **server-side** error and the backend must require/import the Node.js `crypto` module. The same hint can be used for both View and Download.
