# HealthTrack — Project Implementation Plan

## 1. Project Overview
HealthTrack is a healthcare symptom tracking web application built for the AidenAI AI/ML Intern hiring assignment. It enables patients to log symptoms with severity ratings, view their chronological symptom history, and analyze daily average severity trends over the last 30 days.

> **Prototype Disclaimer**: HealthTrack is a local demonstration prototype using synthetic patient data only. `patient_id` filtering is for demonstration scoping and is not an authentication or authorization mechanism.

## 2. Architecture Overview
- **Frontend (`frontend/`)**: React + Vite single-page application styled with Tailwind CSS, using Recharts for data visualization and Lucide React for icons. Communicates with the backend over RESTful JSON APIs.
- **Backend (`backend/`)**: Python + FastAPI service following a clean layered structure (`main.py`, `config.py`, `database.py`, `models.py`, `schemas.py`, `routers/`, `services/`). Uses Pydantic v2 for strict request/response validation and SQLAlchemy 2.x ORM.
- **Database**: Local file-based SQLite database (`backend/healthtrack.db`, gitignored) for zero-config persistence.
- **Testing**: `pytest` (with `httpx` / `TestClient` and isolated temporary SQLite databases) for backend API, validation, and analytics tests; `vitest` + `@testing-library/react` for frontend tests.

## 3. Folder Structure
```text
HealthTrack/
├── .gitignore
├── PROJECT_PLAN.md
├── backend/
│   ├── .env.example
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   └── symptoms.py
│   │   └── services/
│   │       ├── __init__.py
│   │       └── symptoms.py
│   ├── scripts/
│   │   └── seed_demo.py
│   └── tests/
│       ├── conftest.py
│       ├── test_health.py
│       ├── test_symptoms.py
│       └── test_trends.py
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── App.test.jsx
        ├── index.css
        └── main.jsx
```

## 4. Final Backend API Contracts

### `GET /api/health`
- **200 OK**:
  ```json
  {"status": "ok", "service": "healthtrack-api"}
  ```

### `POST /api/symptoms`
- **Request Body**:
  ```json
  {
    "patient_id": "PAT001",
    "description": "Headache and fatigue",
    "severity": 7
  }
  ```
- **Validation**:
  - `patient_id`: required string, trimmed, non-empty, max 100 chars.
  - `description`: required string, trimmed, non-empty, max 1000 chars.
  - `severity`: required `StrictInt` between `1` and `10` (rejects floats, booleans, strings, nulls, and out-of-range integers).
- **201 Created**:
  ```json
  {
    "message": "Symptom logged successfully",
    "data": {
      "id": 1,
      "patient_id": "PAT001",
      "description": "Headache and fatigue",
      "severity": 7,
      "timestamp": "2026-11-25T14:30:00.123456Z"
    }
  }
  ```
- **422 Unprocessable Content**: Standard FastAPI validation error payload.
- **500 Internal Server Error**: Generic safe error message on unexpected database failures (no stack traces or SQL details exposed).

### `GET /api/symptoms?patient_id=PAT001`
- **Query Parameter**: `patient_id` (required, trimmed, non-empty, max 100 chars).
- **200 OK**: JSON array of `SymptomResponse` objects for `patient_id`, sorted by `timestamp` ascending, then `id` ascending. Returns `[]` if no records exist.

### `GET /api/symptoms/trends?patient_id=PAT001`
- **Query Parameter**: `patient_id` (required, trimmed, non-empty, max 100 chars).
- **200 OK**: JSON array of 30 `DailySeverityTrend` objects covering `[today_utc - 29 days, today_utc]` in ascending date order:
  ```json
  {
    "date": "2026-11-25",
    "average_severity": 5.5,
    "symptom_count": 2
  }
  ```
- Days with no logs return `"average_severity": null` and `"symptom_count": 0` (never `0` severity).

## 5. Database Design & Timestamp Strategy
- **Database Path Resolution**: Relative `sqlite:///./...` URLs in `DATABASE_URL` resolve against `backend/` (`BACKEND_DIR`) so the SQLite file location is always `backend/healthtrack.db` regardless of working directory.
- **Table `symptom_logs`**:
  - `id` (`Integer`, PK, auto-increment)
  - `patient_id` (`String(100)`, NOT NULL, indexed)
  - `description` (`String(1000)`, NOT NULL)
  - `severity` (`Integer`, NOT NULL)
  - `timestamp` (`UTCDateTime`, NOT NULL, server-generated UTC)
- **Constraints & Indexes**:
  - `CHECK (severity >= 1 AND severity <= 10)`
  - `CHECK (length(trim(patient_id)) > 0)`
  - `CHECK (length(trim(description)) > 0)`
  - Composite index `ix_symptom_logs_patient_timestamp_id` on `(patient_id, timestamp, id)`.
- **Timestamp Handling**: Custom SQLAlchemy `UTCDateTime` `TypeDecorator` normalizes bound datetimes to UTC, preserves microsecond precision in SQLite, and re-attaches `timezone.utc` on read. Pydantic's `field_serializer` outputs ISO 8601 UTC strings with explicit `Z` suffix.

## 6. Analytics Calculation Method
- Uses a 30-calendar-day UTC window `[today_utc - 29 days, today_utc]` inclusive.
- Excludes records older than the window start (`00:00:00Z` 29 days ago) and any future timestamps (`> now_utc`).
- Groups matching logs by UTC calendar date, computes arithmetic mean `round(sum / count, 2)`, and fills missing dates with `average_severity = None`, `symptom_count = 0`.

## 7. Completed Requirements & Testing Results
- **Phase 4 Requirement Coverage Matrix**:
  - Persistent storage (`patient_id`, `description`, `severity`, `timestamp`): `backend/app/models.py`, `backend/app/database.py` — Verified via Pytest + live SQLite persistence.
  - `>= 5` symptom logs with unique timestamps: `backend/app/services/symptoms.py`, `backend/scripts/seed_demo.py` — Verified via rapid 5-POST Pytest & live HTTP check (`5` unique UTC timestamps).
  - Valid `POST /api/symptoms` & rejection of empty/whitespace descriptions and invalid severities: `backend/app/schemas.py`, `backend/app/routers/symptoms.py` — Verified via 18 parameterized 422 Pytest cases + live HTTP `422`.
  - Patient-specific `GET /api/symptoms` sorted chronologically ascending: `backend/app/services/symptoms.py` — Verified via Pytest (`(timestamp ASC, id ASC)`) & live HTTP.
  - Frontend form, chronological table (latest at bottom), error handling & 30-day Recharts line chart: `frontend/src/components/` — Verified via 10 Vitest tests, `oxlint`, and `vite build`.
- **Phase 4 Bugs Identified & Fixed**:
  1. **Rapid consecutive timestamp collisions on Windows**: `create_symptom_log` now checks the latest persisted timestamp for `patient_id` and advances by `+1 microsecond` if `candidate_ts <= latest_utc`, eliminating Windows ~15.6ms clock tick collisions without `time.sleep`.
  2. **Seed script future timestamps**: `build_demo_records` in `backend/scripts/seed_demo.py` now places all 12 `PAT001` records on `days_ago >= 1` (including a 5-day consecutive streak `days_ago` 5..1 and multi-log days) so no future timestamps are ever generated regardless of UTC time of day.
  3. **Frontend `oxlint` `react(set-state-in-effect)` warning**: Refactored `usePatientSymptoms.js` `useEffect` to resolve `Promise.allSettled` directly inside the effect (`0 warnings, 0 errors`).
  4. **Vite bundle chunk-size notice**: Added `manualChunks` in `frontend/vite.config.js` to split `recharts`/`d3-*` into `charts` chunk (`0` build warnings).
- **Backend Pytest Suite**: `37 passed, 0 failed` (`tests/test_health.py`, `tests/test_symptoms.py`, `tests/test_trends.py`) using isolated temporary SQLite databases.
- **Frontend Vitest Suite**: `10 passed, 0 failed` (`src/App.test.jsx`).
- **Frontend Lint & Build**: `oxlint` passed with `0 warnings, 0 errors`; `vite build` succeeded cleanly in 873ms.
- **Browser Verification**: Automated Chrome verification blocked in this environment (`chrome_devtools` MCP `DevToolsActivePort` unavailable); manual verification checklist provided to the user.
- **Security & Prototype Limitations**:
  - `patient_id` filtering is for demo scoping only, not authentication or authorization.
  - Synthetic patient data only; no secrets or `.db`/`.env` files tracked in Git.
  - SQLite single-writer concurrency is intended for local prototype demonstration.

## 8. Commands to Run Backend & Frontend
Backend (from `d:\HealthTrack\backend`):
- **Start server**: `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`
- **Run tests**: `.\.venv\Scripts\pytest.exe -v`
- **Seed synthetic demo data**: `.\.venv\Scripts\python.exe -m scripts.seed_demo`

Frontend (from `d:\HealthTrack\frontend`):
- **Start dev server**: `npm run dev`
- **Run tests**: `npm run test`
- **Run lint**: `npm run lint`
- **Build production bundle**: `npm run build`

## 9. Frontend Architecture & Decisions (Phase 3)
- **Component Structure**: `Header`, `PatientSelector`, `SummaryCards`, `SymptomForm`, `SeverityChart`, `SymptomTable`, `FeedbackMessage`, `EmptyState`, and `Footer`, coordinated by `usePatientSymptoms` hook and `src/api/symptoms.js`.
- **API Integration**: Native `fetch` with `URLSearchParams`, `AbortController` + monotonic request sequence counter to prevent stale patient responses from overwriting active patient state, FastAPI `422` `detail` parsing, safe `500` handling, and no automatic retries on `POST`.
- **Accessibility & Error Handling**: Semantic landmarks, explicit `<label>`/`aria-describedby`/`aria-invalid` associations, `role="radiogroup"` for 1–10 severity selection, `aria-live="polite"` feedback alerts with icons + text, and `Retry` actions on failed `GET` requests.

## 10. Implementation Phases & AI Disclosure Log
1. **Phase 1 — Project Initialization (Done)**: Workspace setup, Vite + React + Tailwind CSS, FastAPI + venv, `PROJECT_PLAN.md`, `.gitignore`, `/api/health`, initial Git commit (`1d2e911`).
2. **Phase 2 — Backend Database, Models, API & Analytics (Done)**: AI-assisted implementation of SQLAlchemy 2.x models/DB session management, Pydantic v2 strict validation, REST endpoints, 30-day UTC trend analytics, synthetic seed script, and 35 Pytest tests.
3. **Phase 3 — Frontend Core UI, History Table & Trends Integration (Done)**: AI-assisted implementation of healthcare UI design system, `usePatientSymptoms` hook, centralized `fetch` API client, `SymptomForm`, `SymptomTable`, `SeverityChart` (Recharts), `SummaryCards`, and 7 Vitest integration tests.
4. **Phase 4 — Quality Assurance, Bug Fixes & Verification (Done)**: Fixed Windows timestamp collision edge case, eliminated future timestamps in `seed_demo.py`, resolved `oxlint` warning, split Recharts chunk, expanded backend (37) and frontend (10) test suites, and audited repository security.
5. **Phase 5 — Final Documentation & Submission Prep (Next)**: Create final `README.md` with AI usage disclosure, perform manual browser checklist, and push approved Phase 4–5 commits.
