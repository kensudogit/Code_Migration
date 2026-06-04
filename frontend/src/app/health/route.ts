/** Full status: web always up; API may still be warming (use /health/live for deploy probes). */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const API_BASE = (process.env.API_URL ?? 'http://127.0.0.1:8091').replace(/\/$/, '')

export async function GET() {
  let apiOk = false
  let apiError: string | null = null

  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    apiOk = res.ok
    if (!res.ok) {
      apiError = `HTTP ${res.status}`
    }
  } catch (err) {
    apiError = err instanceof Error ? err.message : 'fetch failed'
  }

  return Response.json(
    {
      ok: apiOk,
      service: 'code-migration-unified',
      web: true,
      api: apiOk,
      api_url: API_BASE,
      api_error: apiError,
      unified: process.env.UNIFIED_DEPLOY === '1',
      live_probe: '/health/live',
    },
    { status: 200 },
  )
}
