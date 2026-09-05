# Deedmark — project scaffold

Same stack pattern as your travel-planner-app (Vite/React + Firebase), extended with
Google Cloud Document AI for OCR and a server-side Claude call for title analysis.

## Why the API calls moved server-side

The travel planner called the Anthropic API directly from the browser using
`VITE_ANTHROPIC_KEY`. That's fine for a demo, but not here: this app will handle real
client documents (family details, ownership history, ID numbers), so the Anthropic key
and the Document AI credentials both live in a Cloud Function instead of the client
bundle. The React app calls your own function; your function calls Google Cloud and
Claude. Nothing sensitive ships to the browser.

## Structure

```
deedmark-app/
  src/                      React app (Vite)
    firebase.js             Firebase init (auth, firestore, storage, functions)
    lib/api.js              Thin wrapper that calls the analyzeDocument function
    components/
      DocumentUpload.jsx    Upload UI -> calls analyzeDocument
      MatterBrief.jsx       Renders the brief / chain / missing docs result
    App.jsx
  functions/                 Cloud Functions (Node)
    index.js                 analyzeDocument: OCR (Document AI) -> Claude -> Firestore
    package.json
  firestore.rules            Role-based access: partner / junior / client
  storage.rules
  firebase.json
  .env.example
```

## One-time setup

1. **Firebase project** — `firebase init` (Hosting, Firestore, Functions, Storage) or
   reuse the project from travel-planner-app if you want to keep billing/config in one place.
2. **Enable Document AI** in Google Cloud Console for the same project, and create a
   **Document OCR processor** (Document AI → Create Processor → "Document OCR"). Copy
   the processor ID into `functions/.env`.
3. **Anthropic API key** — store it as a Cloud Functions secret, not a plain env var:
   ```
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
4. Copy `.env.example` to `.env` in both the root and `functions/`, fill in the values.
5. `npm install` in the root, and separately inside `functions/`.
6. `firebase emulators:start` to run auth + firestore + functions locally before deploying.

## Data model (Firestore)

```
users/{uid}          { role: 'partner' | 'junior' | 'client', name, ... }
matters/{matterId}   { clientId, juniorId, partnerId, clientName, brief, status, createdAt }
matters/{matterId}/documents/{docId}
                      { fileName, storagePath, docType, ocrText, uploadedBy, createdAt }
matters/{matterId}/analysis/{analysisId}
                      { brief, chainOfTitle: [...], missingDocs: [...], flags: [...], createdAt }
```

## What's real vs. stubbed in this scaffold

- Firebase init, security rules, upload UI, and the function's control flow are complete
  and should run as-is once you fill in project config.
- The Document AI and Anthropic calls are structurally correct (real SDK usage, real
  request/response shapes) but untested against your actual GCP project — you'll want to
  run a real document through the emulator before trusting the output shape.
- Auth (login screen, role assignment) is not wired up yet — this scaffold assumes a
  `users/{uid}.role` field already exists; add Firebase Auth + a simple role-claim setup
  next.
