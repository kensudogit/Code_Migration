#!/bin/sh
# Railway unified: FastAPI (internal) + Next.js (PORT). Uses Railway Variables (OPENAI_API_KEY, DATABASE_URL).
set -e

WEB_PORT="${PORT:-3000}"
API_PORT="${API_INTERNAL_PORT:-8091}"

export API_INTERNAL_PORT="${API_PORT}"
export API_URL="http://127.0.0.1:${API_PORT}"
export UNIFIED_DEPLOY=1

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_PRIVATE_URL:-}" ]; then
  export DATABASE_URL="${DATABASE_PRIVATE_URL}"
  echo "[unified] using DATABASE_PRIVATE_URL as DATABASE_URL"
fi

echo "[unified] web=${WEB_PORT} api=${API_PORT}"
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[unified] DATABASE_URL=set"
else
  echo "[unified] DATABASE_URL=empty (history disabled until Postgres is linked)"
fi
if [ -n "${OPENAI_API_KEY:-}" ]; then
  echo "[unified] OPENAI_API_KEY=set"
else
  echo "[unified] OPENAI_API_KEY=empty"
fi
echo "[unified] OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}"

case "${OPENAI_API_KEY:-}" in
  sk-ant*)
    echo "[unified] WARNING: OPENAI_API_KEY looks like Anthropic (sk-ant-). Use an OpenAI key (sk-...)."
    ;;
esac

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "[unified] WARNING: OPENAI_API_KEY is empty - conversions run in mock mode"
  echo "[unified]   Railway -> this service -> Variables -> OPENAI_API_KEY -> Redeploy"
fi

echo "[unified] starting FastAPI (background)..."
python -m uvicorn app.main:app --host 0.0.0.0 --port "${API_PORT}" --workers 1 &
API_PID=$!

# Wait for API in background only — Railway /health hits Next on $PORT, not this port.
(
  i=0
  while [ "$i" -lt 60 ]; do
    if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
      echo "[unified] API ready on 127.0.0.1:${API_PORT}"
      exit 0
    fi
    if ! kill -0 "$API_PID" 2>/dev/null; then
      echo "[unified] WARNING: FastAPI exited early (UI will lack backend until fixed)"
      exit 0
    fi
    i=$((i + 1))
    sleep 0.5
  done
  echo "[unified] WARNING: API not ready within 30s (continuing; check DATABASE_URL / logs)"
) &

echo "[unified] starting Next.js on 0.0.0.0:${WEB_PORT} (Railway healthcheck -> /health)"
cd /app/frontend
export PORT="${WEB_PORT}"
export HOSTNAME=0.0.0.0
exec npx next start --hostname 0.0.0.0 --port "${WEB_PORT}"
