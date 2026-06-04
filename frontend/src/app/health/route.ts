/** Railway healthcheck: web + internal FastAPI must both respond. */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const API_BASE = (process.env.API_URL ?? 'http://127.0.0.1:8091').replace(/\/$/, '')

export async function GET() {
  let apiOk = false
  let apiError: string | null = null

  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    apiOk = res.ok
    if (!res.ok) {
      apiError = `HTTP ${res.status}`
    }
  } catch (err) {
    apiError = err instanceof Error ? err.message : 'fetch failed'
  }

  const ok = apiOk
  return Response.json(
    {
      ok,
      service: 'code-migration-unified',
      web: true,
      api: apiOk,
      api_url: API_BASE,
      api_error: apiError,
      unified: process.env.UNIFIED_DEPLOY === '1',
    },
    { status: ok ? 200 : 503 },
  )
}
