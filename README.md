# AI Code Migration Studio — Multi-Language Modernization

> **AI-Assisted Code Modernization** — Java / Python / TypeScript / COBOL / Go間のコード変換を、AIとStructured Outputsで支援し、変換履歴・警告・トークン使用量まで管理するモダナイゼーション・スタジオです。
>
> **Stack:** Python · FastAPI · Next.js · React · PostgreSQL · OpenAI · Docker · Railway

## Architecture

```text
Legacy / Existing Source Code
            │
            ▼
     Next.js Migration UI
            │
            ▼
       FastAPI Backend
            │
      conversion rules
            +
       AI conversion
            │
            ▼
 Structured Output
 code / warnings / notes
            │
            ▼
 PostgreSQL Job History
```

## Engineering Focus

- COBOL ↔ Javaを含む多言語コード変換
- AI出力をJSON Schemaで拘束するStructured Outputs
- 変換結果・警告・利用量・request IDの追跡
- AI未設定時にも動作可能なmock構成
- Docker / Railwayによる再現可能な実行環境
- Legacy Modernization工程へのAI適用

## Portfolio Context

This repository is the **AI Code Modernization** component of the Legacy Modernization portfolio. It complements `cobol` as a language-mapping reference and `transplant` as a system-level mainframe migration architecture.

## Features

| Direction | API `direction` |
|-----------|-----------------|
| Java ? Python | `java_to_python` |
| Python ? Java | `python_to_java` |
| Java ? TypeScript | `java_to_typescript` |
| TypeScript ? Java | `typescript_to_java` |
| COBOL ? Java | `cobol_to_java` |
| Java ? COBOL | `java_to_cobol` |
| Go ? Python | `go_to_python` |
| Python ? Go | `python_to_go` |
| Go ? Java | `go_to_java` |
| Java ? Go | `java_to_go` |

## Quick start (Docker ? recommended)

```powershell
cd C:\devlop\Code_Migration
copy .env.example .env
# Set OPENAI_API_KEY in .env for real AI conversion

docker compose up -d --build
```

| Service | URL |
|---------|-----|
| **Web UI (Next.js)** | http://localhost:3001 (`WEB_PUBLISH_PORT` ????) |
| API / Swagger | http://localhost:8090/docs |
| PostgreSQL | localhost:5434 (`codemig` / `codemig`) ? `POSTGRES_PUBLISH_PORT` ???? |

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

Open http://localhost:3001 (Docker) ? API requests proxy to `http://localhost:8090` via `next.config.ts`.

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
