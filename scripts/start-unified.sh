#!/bin/sh
# Railway unified: FastAPI (internal) + Next.js standalone (PORT).
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
node --version 2>/dev/null || echo "[unified] WARNING: node not in PATH"
python --version 2>/dev/null || true

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

wait_for_api() {
  curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1
}

# Start API in main shell (avoid $(...) subshell killing background uvicorn)
echo "[unified] starting FastAPI in background..."
python -m uvicorn app.main:app --host 127.0.0.1 --port "${API_PORT}" --workers 1 --timeout-keep-alive 75 &
API_PID=$!

(
  i=0
  while [ "$i" -lt 120 ]; do
    if wait_for_api; then
      echo "[unified] API ready on 127.0.0.1:${API_PORT} (pid ${API_PID})"
      break
    fi
    if ! kill -0 "${API_PID}" 2>/dev/null; then
      echo "[unified] FastAPI exited during startup — restarting (attempt $i)"
      python -m uvicorn app.main:app --host 127.0.0.1 --port "${API_PORT}" --workers 1 --timeout-keep-alive 75 &
      API_PID=$!
    fi
    i=$((i + 1))
    sleep 1
  done
  if ! wait_for_api; then
    echo "[unified] WARNING: API not healthy after 120s (web still serves /health/live)"
  fi
) &

(
  while true; do
    sleep 15
    if ! kill -0 "${API_PID}" 2>/dev/null; then
      echo "[unified] FastAPI not running — restarting"
      python -m uvicorn app.main:app --host 127.0.0.1 --port "${API_PORT}" --workers 1 --timeout-keep-alive 75 &
      API_PID=$!
      j=0
      while [ "$j" -lt 30 ]; do
        if wait_for_api; then
          echo "[unified] API restarted (pid ${API_PID})"
          break
        fi
        j=$((j + 1))
        sleep 1
      done
    elif ! wait_for_api; then
      echo "[unified] WARNING: API process alive but /health failed"
    fi
  done
) &

echo "[unified] starting Next.js standalone on 0.0.0.0:${WEB_PORT} (health -> /health/live)"
if [ ! -f /app/web/server.js ]; then
  echo "[unified] ERROR: missing /app/web/server.js (standalone build)"
  ls -la /app/web 2>/dev/null || true
  exit 1
fi

cd /app/web
export PORT="${WEB_PORT}"
export HOSTNAME=0.0.0.0
exec node server.js
