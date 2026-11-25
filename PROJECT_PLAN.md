# HealthTrack — Project Implementation Plan

## 1. Project Overview
HealthTrack is a healthcare symptom tracking web application built for the AidenAI AI/ML Intern hiring assignment. It enables patients to log symptoms with severity ratings, view their chronological symptom history, and analyze daily average severity trends over the last 30 days.

## 2. Architecture Overview
- **Frontend (`frontend/`)**: React + Vite single-page application styled with Tailwind CSS, using Recharts for data visualization and Lucide React for icons. Communicates with the backend over RESTful JSON APIs.
- **Backend (`backend/`)**: Python + FastAPI service following a clean layered structure (`main.py`, `config.py`, `database.py`, `models.py`, `schemas.py`, `routers/`). Uses Pydantic for strict request/response validation and SQLAlchemy 2.x ORM.
- **Database**: Local SQLite database (`healthtrack.db`) for zero-config persistence, storing synthetic patient symptom logs.
- **Testing**: `pytest` (with `httpx` / `TestClient`) for backend API & validation tests; `vitest` + `@testing-library/react` for frontend component & error-handling tests.

## 3. Folder Structure
```text
HealthTrack/
├── .gitignore
├── PROJECT_PLAN.md
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   └── routers/
│   │       └── __init__.py
│   └── tests/
│       └── test_health.py
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

## 4. API Contracts (Planned)
### Health Check (Phase 1)
- `GET /api/health`
  - **200 OK**: `{"status": "ok", "service": "healthtrack-api"}`

### Create Symptom Log (Phase 2)
- `POST /api/symptoms`
  - **Request Body**:
    ```json
    {
      "patient_id": "patient-001",
      "description": "Mild tension headache",
      "severity": 4,
      "timestamp": "2026-11-25T10:30:00Z" // optional; defaults to current UTC time
    }
    ```
  - **201 Created**: Returns the created symptom log record including `id`.
  - **422 Unprocessable Entity**: Rejects empty/whitespace-only `description` or `patient_id`, and `severity` outside `1..10`.

### List Patient Symptom Logs (Phase 2)
- `GET /api/symptoms?patient_id=patient-001`
  - **200 OK**: Returns array of symptom logs for `patient_id` sorted by `timestamp` ascending (oldest first, latest at the bottom).

### 30-Day Daily Average Severity Trend (Phase 2/4)
- `GET /api/symptoms/trends?patient_id=patient-001&days=30` (or computed/returned cleanly via dedicated endpoint)
  - **200 OK**: Returns daily average severity points for the last 30 days sorted by date ascending.

## 5. Requirement Mapping
| # | Assignment Requirement | Implementation |
|---|---|---|
| 1 | Persistent DB storing patient ID, symptom description, severity (1–10), timestamp | SQLite + SQLAlchemy 2.x `SymptomLog` model |
| 2 | Store & retrieve >= 5 symptom logs with unique timestamps for a single patient | Seed script / tests + unique/distinct timestamps for synthetic patient |
| 3 | POST API endpoint with proper input validation | `POST /api/symptoms` with Pydantic v2 validators |
| 4 | Reject empty/whitespace-only descriptions and invalid severity values | Pydantic `field_validator` + `Field(ge=1, le=10)` |
| 5 | GET API endpoint for patient-specific logs sorted by timestamp ascending | `GET /api/symptoms` with `ORDER BY timestamp ASC` |
| 6 | User-friendly frontend for submitting symptoms & viewing history table (latest at bottom) | React form + chronological table component |
| 7 | Frontend error handling for network failures and server errors | `try/catch` fetch wrapper + user-friendly inline error alerts |
| 8 | Line chart displaying daily average symptom severity over the last 30 days | Recharts `LineChart` with responsive container & tooltip |

## 6. Implementation Phases
1. **Phase 1 — Project Initialization (Current)**: Workspace setup, Vite + React + Tailwind CSS, FastAPI + venv, `PROJECT_PLAN.md`, `.gitignore`, minimal `/api/health` endpoint, scaffold verification, initial Git commit.
2. **Phase 2 — Backend Database, Models & API**: SQLAlchemy 2.x setup, `SymptomLog` model, Pydantic validation, `POST /api/symptoms`, `GET /api/symptoms`, `GET /api/symptoms/trends`, synthetic seed data (>= 5 logs with unique timestamps), and Pytest unit/integration tests.
3. **Phase 3 — Frontend Core UI & History Table**: API client with error handling, symptom submission form with client-side & server error display, patient selector/ID input, chronological symptom history table (latest at bottom).
4. **Phase 4 — 30-Day Severity Trend Chart & Polish**: Recharts daily average severity line chart, Vitest component tests, UI/UX polish, and documentation (`README.md`).
