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

wait_for_api() {
  curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1
}

start_api() {
  python -m uvicorn app.main:app --host 127.0.0.1 --port "${API_PORT}" --workers 1 --timeout-keep-alive 75 &
  echo $!
}

echo "[unified] starting FastAPI in background..."
API_PID="$(start_api)"

# Warm API without blocking web bind (Railway healthcheck uses /health/live)
(
  i=0
  while [ "$i" -lt 120 ]; do
    if wait_for_api; then
      echo "[unified] API ready on 127.0.0.1:${API_PORT} (pid ${API_PID})"
      break
    fi
    if ! kill -0 "${API_PID}" 2>/dev/null; then
      echo "[unified] FastAPI exited during startup — restarting (attempt $i)"
      API_PID="$(start_api)"
    fi
    i=$((i + 1))
    sleep 1
  done
  if ! wait_for_api; then
    echo "[unified] WARNING: API not healthy after 120s (web still serves /health/live)"
  fi
) &

# Keep API alive while Next.js runs (OOM/crash recovery)
(
  while true; do
    sleep 15
    if ! kill -0 "${API_PID}" 2>/dev/null; then
      echo "[unified] FastAPI not running — restarting"
      API_PID="$(start_api)"
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

echo "[unified] starting Next.js on 0.0.0.0:${WEB_PORT} (Railway healthcheck -> /health/live)"
cd /app/frontend
export PORT="${WEB_PORT}"
export HOSTNAME=0.0.0.0
exec node ./node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "${WEB_PORT}"
