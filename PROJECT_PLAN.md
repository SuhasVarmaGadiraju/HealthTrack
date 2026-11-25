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

## 7. Completed Backend Requirements & Testing Results
- **Phase 2 Pytest Suite**: `35 passed, 0 failed` (`tests/test_health.py`, `tests/test_symptoms.py`, `tests/test_trends.py`) using isolated temporary SQLite databases via `tmp_path`.
- **Known Limitations**:
  - No authentication/authorization (`patient_id` is a demo scope filter).
  - SQLite single-writer concurrency is suitable for a local prototype, not high-concurrency production workloads.
  - Same-millisecond rapid-fire requests on Windows may share a system clock tick; deterministic ordering falls back to `id` ascending.

## 8. Backend Commands
Run from `d:\HealthTrack\backend`:
- **Start server**: `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`
- **Run tests**: `.\.venv\Scripts\pytest.exe -v`
- **Seed synthetic demo data**: `.\.venv\Scripts\python.exe -m scripts.seed_demo`

## 9. Implementation Phases & AI Disclosure Log
1. **Phase 1 — Project Initialization (Done)**: Workspace setup, Vite + React + Tailwind CSS, FastAPI + venv, `PROJECT_PLAN.md`, `.gitignore`, `/api/health`, initial Git commit (`1d2e911`).
2. **Phase 2 — Backend Database, Models, API & Analytics (Done)**: AI-assisted implementation of SQLAlchemy 2.x models/DB session management, Pydantic v2 strict validation, REST endpoints, 30-day UTC trend analytics, synthetic seed script, and 35 Pytest tests.
3. **Phase 3 — Frontend Core UI & History Table (Next)**: API client with error handling, symptom submission form, patient ID selector, chronological symptom history table (latest at bottom).
4. **Phase 4 — 30-Day Severity Trend Chart & Polish**: Recharts daily average severity line chart, Vitest component tests, UI/UX polish, and `README.md`.
