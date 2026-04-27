# Medora AI Flow Documentation

This document describes the AI-driven features and workflows within the Medora application, covering both individual document processing and longitudinal health insights.

> **Last updated: v1.1.0 (2026-04-27)** — Fixed upload flow, AI trigger, and summary polling.

---

## 1. Document Processing Flow (Individual Records)

When a user uploads a medical document (PDF or Image), the system performs an automated analysis to extract key medical information.

### Step-by-Step Workflow:

1. **Selection**: The user selects a document (PDF/Image) and a destination folder in the mobile app.

2. **Record Upload** (`POST /records/upload`):
   - The file is uploaded to Supabase Storage.
   - The backend **automatically queues an AI job** (`ai_jobs` table) for **all** uploads (both patient and hospital). *(Fixed in v1.1.0 — previously only hospital uploads triggered AI.)*
   - Response: `{ record: { id, file_url, ai_summary: null, ... } }`

3. **AI Summarize Call** (`POST /ai/summarize`):
   - The Upload screen simultaneously sends the file to `/ai/summarize` to receive a `jobId` for real-time polling.
   - If the file was processed before (same SHA-256 hash), the response includes `fromCache: true` with the result directly.

4. **Status Polling** (`GET /ai/status/:jobId`):
   - The app polls every 3 seconds, up to 30 attempts (~90 seconds max).
   - The backend worker (`aiProcessor.js`) processes the job async and writes the result to both `ai_jobs.result` and `records.ai_summary`.
   - Polling state values: `pending` → `processing` → `completed` / `failed`

5. **Completion & Display**:
   - On `completed`: The Upload screen shows a success state and navigates to the Records tab.
   - On the **Medical Insights** screen (`summary/[id].tsx`): The screen fetches the record and auto-polls every 4 seconds (up to 20 attempts) until `ai_summary` is populated in the DB.

### AI Backend Pipeline (per file):

| Attempt | Method | Notes |
|---------|--------|-------|
| 1st | Gemini Vision (inline base64) | Best quality, handles both PDFs and images |
| 2nd | Text extraction + Gemini text | `pdf-parse` v2 for PDFs, Tesseract OCR for images |
| 3rd | OpenRouter fallback | Used if both Gemini attempts fail |
| 4th | Safe fallback response | Returns generic JSON, never fails the client |

---

## 2. Longitudinal AI Flow (Smart Insights)

Medora provides a high-level "Smart Insight" on the home screen by analysing the user's entire medical history longitudinally.

### Step-by-Step Workflow:

1. **Data Retrieval**: Upon opening the home screen, the app fetches all medical records for the authenticated user.
2. **Summary Aggregation**: It filters all records to collect those that have an existing `ai_summary`.
3. **Insight Generation**:
   - The app sends this collection of summaries to `aiService.summarizeSummaries` (endpoint: `POST /ai/summarize-summaries`).
   - The AI (Gemini 2.5 Flash) reviews the historical data to identify trends.
4. **Display**: The result is shown in the **Smart Insights** card as a "Longitudinal Health Overview."

---

## 3. Technology Stack

- **Frontend**: React Native (Expo)
- **Backend**: Node.js / Express
- **AI Engine**: Google Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Storage**: Supabase Storage (bucket: `records`)
- **DB Queue**: Supabase `ai_jobs` table (polled by `aiProcessor.js` worker every 5 seconds)
- **PDF Extraction**: `pdf-parse` v2 (direct `pdfParse(buffer)` call)
- **Image OCR**: Tesseract.js

---

## 4. Key Endpoints

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/records/upload` | `POST` | JWT | Uploads document, stores in Supabase, queues AI job for ALL uploads |
| `/records/user/:id` | `GET` | JWT | Fetches records incl. `ai_summary` (poll to check AI completion) |
| `/ai/summarize` | `POST` | None | Submits file(s) for AI analysis, returns `jobId` |
| `/ai/status/:jobId` | `GET` | None | Polls status of a specific AI job |
| `/ai/summarize-summaries` | `POST` | None | Generates longitudinal health insights from multiple summaries |

---

## 5. Bugs Fixed in v1.1.0

| # | Location | Bug | Fix |
|---|----------|-----|-----|
| 1 | `backend/src/utils/textExtractor.js` | `pdf-parse` v2 API broken (used old v1 `new PDFParse().getText()` syntax) | Replaced with correct `pdfParse(buffer)` call |
| 2 | `backend/src/controllers/record.controller.js` | AI job only queued for hospital uploads — patient uploads never got `ai_summary` | Changed condition from `isHospitalUpload && recordId` to `recordId && req.file && req.file.buffer` |
| 3 | `backend/src/routes/ai.routes.js` | `uploads/documents/` directory not guaranteed to exist — multer threw ENOENT | Added `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` at startup |
| 4 | `backend/src/controllers/ai.controller.js` | `summarizeSummaries` used non-existent model `'gemini-flash-latest'` | Fixed to `'gemini-2.5-flash'` |
| 5 | `MedoraV2/app/upload/index.tsx` | Upload screen never called `/ai/summarize` endpoint — no jobId, no polling | Added full AI summarize → poll loop with live status text |
| 6 | `MedoraV2/app/summary/[id].tsx` | Summary page showed "AI in progress" forever with no auto-refresh | Replaced with proper polling loop (4s × 20 attempts) with state messages and "Check Again" button |
| 7 | `MedoraV2/app/(tabs)/records.tsx` | Sorted Recent Docs by `visit_date` (null for patient uploads) → broken order | Changed sort key to `created_at` |

---

## 6. Vercel Compatibility Fixes in v1.2.0

> [!IMPORTANT]
> **Required Supabase DB Migration** — run this before deploying v1.2.0:
> ```sql
> ALTER TABLE ai_jobs ADD COLUMN IF NOT EXISTS base64_data TEXT;
> ```

| # | Location | Bug | Fix |
|---|----------|-----|-----|
| 1 | `src/workers/aiProcessor.js` | `setInterval` background worker doesn't run on Vercel serverless | Guarded by `!process.env.VERCEL`; worker reads `base64_data` from DB instead of disk path |
| 2 | `src/routes/ai.routes.js` | Multer `diskStorage` writes to `uploads/` — crashes on Vercel (read-only FS) | Switched to `multer.memoryStorage()` |
| 3 | `src/utils/textExtractor.js` | Read from file path — no disk file on Vercel | Added `extractTextFromBuffer(buffer, mimetype)` |
| 4 | `src/utils/hash.js` | `generateFileHash` reads from disk path | Added `generateBufferHash(buffer)` |
| 5 | `src/services/aiService.js` | `processDocumentWithAI(filePath)` reads disk | Changed to `processDocumentWithAI(buffer, mimetype)` |
| 6 | `src/controllers/ai.controller.js` | Disk-based file processing in `/ai/summarize` | Now processes synchronously from buffer — no job queue needed |
| 7 | `src/controllers/record.controller.js` | Wrote to `/tmp` then stored path in DB — path gone when worker runs | Stores `base64_data` in `ai_jobs` row |
| 8 | `src/controllers/hospital.controller.js` | Same disk write issue | Same base64 fix |
| 9 | `src/server.js` | `startWorker()` runs `setInterval` which is killed by Vercel | Wrapped in `if (!process.env.VERCEL)` guard |
| 10 | `vercel.json` | No function timeout set — Gemini calls timed out at 10s default | Added `maxDuration: 60` |
