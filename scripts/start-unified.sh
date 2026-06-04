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
echo "[unified] DATABASE_URL=${DATABASE_URL:+set}${DATABASE_URL:-empty}"
echo "[unified] OPENAI_API_KEY=${OPENAI_API_KEY:+set}${OPENAI_API_KEY:-empty}"
echo "[unified] OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}"

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "[unified] WARNING: OPENAI_API_KEY is empty — conversions run in mock mode"
  echo "[unified]   Railway ? this service ? Variables ? OPENAI_API_KEY ? Redeploy"
fi

echo "[unified] starting FastAPI..."
python -m uvicorn app.main:app --host 0.0.0.0 --port "${API_PORT}" &
API_PID=$!

ready=0
i=0
while [ "$i" -lt 120 ]; do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[unified] ERROR: FastAPI exited before becoming ready"
    wait "$API_PID" 2>/dev/null || true
    exit 1
  fi
  i=$((i + 1))
  sleep 0.5
done

if [ "$ready" -ne 1 ]; then
  echo "[unified] ERROR: FastAPI not ready on 127.0.0.1:${API_PORT}"
  kill "$API_PID" 2>/dev/null || true
  exit 1
fi

echo "[unified] API ready; starting Next.js on ${WEB_PORT}"
cd /app/frontend
PORT="${WEB_PORT}" HOSTNAME=0.0.0.0 exec npm start
