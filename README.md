# Code Migration

Python + PostgreSQL + **Next.js** AI code conversion studio.

## Features

| Direction | API `direction` |
|-----------|-----------------|
| Java ? Python | `java_to_python` |
| Python ? Java | `python_to_java` |
| Java ? TypeScript | `java_to_typescript` |
| TypeScript ? Java | `typescript_to_java` |
| COBOL ? Java | `cobol_to_java` |
| Java ? COBOL | `java_to_cobol` |

## Quick start (Docker ? recommended)

```powershell
cd C:\devlop\Code_Migration
copy .env.example .env
# Set OPENAI_API_KEY in .env for real AI conversion

docker compose up -d --build
```

| Service | URL |
|---------|-----|
| **Web UI (Next.js)** | http://localhost:3000 |
| API / Swagger | http://localhost:8090/docs |
| PostgreSQL | localhost:5433 (`codemig` / `codemig`) |

## Local dev (split)

**Backend**

```powershell
cd C:\devlop\Code_Migration
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
docker compose up -d postgres
python scripts/init_db.py
python -m app.main
```

**Frontend**

```powershell
cd C:\devlop\Code_Migration\frontend
npm install
copy ..\.env.example ..\.env
npm run dev
```

Open http://localhost:3000 ? API requests proxy to `http://localhost:8090` via `next.config.ts`.

## Project layout

```
Code_Migration/
??? app/                 FastAPI backend
??? frontend/            Next.js 15 + React UI
??? migrations/          PostgreSQL schema
??? scripts/             CLI & init_db
??? samples/             Example source files
??? docker-compose.yml
```

Conversion history is stored in `conversion_jobs` (visible in the Web UI sidebar and `GET /api/v1/jobs`).

## OpenAI Platform

Conversion uses the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) with **Structured Outputs** (`response_format: json_schema`) for reliable `converted_code`, `warnings`, and `notes` fields.

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for real AI (mock when empty) |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `OPENAI_ORG_ID` | Optional organization ID |
| `OPENAI_PROJECT` | Optional project ID |
| `OPENAI_BASE_URL` | Optional custom API base URL |
| `OPENAI_TIMEOUT` | Request timeout seconds (default 120) |
| `OPENAI_MAX_RETRIES` | Client retries (default 2) |
| `OPENAI_MAX_OUTPUT_TOKENS` | Max completion tokens (default 16384) |

API responses include `warnings`, `usage` (token counts), and `request_id`. Job history stores token usage and warnings after migration `002_openai_platform.sql`.

## Railway deploy

The app reads `OPENAI_API_KEY` from **Railway Variables** (environment variables take precedence over local `.env`).

```powershell
railway login
railway link -p <Project-ID>
railway variables set OPENAI_API_KEY=sk-...
railway up
```

| Setting | Value |
|---------|-------|
| Config file | `/railway.toml` |
| Dockerfile | `Dockerfile.unified` (Web + API) |
| Health | `/health` |

See [docs/RAILWAY.md](docs/RAILWAY.md) and `.env.railway.example`.
