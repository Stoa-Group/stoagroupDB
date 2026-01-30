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

**Fix (backend):** In the file that handles:

- `GET /api/pipeline/deal-pipeline/attachments/:id/download`

(or any helper that uses `crypto` for file serving/signing), ensure the Node.js `crypto` module is loaded at the top:

- **CommonJS:** `const crypto = require('crypto');`
- **ESM / TypeScript:** `import crypto from 'crypto';`

Use `crypto` only after it has been required/imported. Once that’s in place, View/Download should stop returning "crypto is not defined".

**In this repo:** The pipeline controller that handles the download route has `import crypto from 'crypto'` at the top so the module is loaded when the controller is loaded.

---

## Frontend behavior when the error occurs

When the server returns "crypto is not defined", the app can show that message plus a short note that it’s a **server-side** error and the backend must require/import the Node.js `crypto` module. The same hint can be used for both View and Download.
