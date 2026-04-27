# Medora AI Flow Documentation

This document describes the AI-driven features and workflows within the Medora application, covering both individual document processing and longitudinal health insights.

---

## 1. Document Processing Flow (Individual Records)

When a user uploads a medical document (PDF or Image), the system performs an automated analysis to extract key medical information.

### Step-by-Step Workflow:
1.  **Selection**: The user selects a document (PDF/Image) and a destination folder in the mobile app.
2.  **AI Request**: The app sends the document(s) to the `/ai/summarize` endpoint.
3.  **Job Creation (Backend)**:
    *   The backend receives the file(s) and creates an asynchronous processing job.
    *   It returns a `jobId` immediately to the client.
    *   The backend extracts text and uses **Google Gemini** with a medical parsing prompt to generate a structured summary.
4.  **Status Polling**:
    *   The mobile app receives the `jobId` and begins polling the `/ai/status/:jobId` endpoint every 3 seconds.
    *   Once the job state is `completed`, the backend returns the full `ai_summary` object.
5.  **Completion & Display**: 
    *   The app displays the analyzed results.
    *   The full breakdown is rendered in the **Medical Insights** screen (`summary/[id].tsx`).

---

## 2. Longitudinal AI Flow (Smart Insights)

Medora provides a high-level "Smart Insight" on the home screen by analyzing the user's entire medical history longitudinaly.

### Step-by-Step Workflow:
1.  **Data Retrieval**: Upon opening the home screen, the app fetches all medical records for the authenticated user.
2.  **Summary Aggregation**: It filters all records to collect those that have an existing `ai_summary`.
3.  **Insight Generation**:
    *   The app sends this collection of summaries to the `aiService.summarizeSummaries` method (endpoint: `/ai/summarize-summaries`).
    *   The AI (Gemini) reviews the historical data to identify trends (e.g., "vital signs are within normal ranges" or "improvement in hemoglobin levels").
4.  **Display**: The result is shown in the **Smart Insights** card as a "Longitudinal Health Overview."

---

## 3. Technology Stack

*   **Frontend**: React Native (Expo)
*   **Backend**: Node.js / Express
*   **AI Engine**: Google Gemini 1.5 Pro / Flash
*   **Integration**:
    *   `axios` for API communication.
    *   `lucide-react-native` for status icons (Sparkles, Pill, Alert).
    *   Structured JSON mapping between backend analysis and frontend rendering.

---

## 4. Key Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/records/upload` | `POST` | Uploads document and triggers AI analysis. |
| `/records/user/:id` | `GET` | Fetches records (polled to check AI status). |
| `/ai/summarize-summaries` | `POST` | Generates longitudinal health insights from multiple records. |
| `/ai/status/:jobId` | `GET` | (Optional) Checks specific AI processing job status. |
